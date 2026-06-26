import axios, { AxiosError, type AxiosInstance } from 'axios'
import { webSiteLink } from '@/shared/links'
import { getEnv } from '@/shared/env'

export class CsrfError extends Error {
    constructor(cause: Error) {
        super(cause.message)
        this.name = 'CsrfError'
        this.stack = cause.stack
    }
}

// Per-attempt cap. Kept below the worst-case (attempts × timeout + backoff) so a
// failing request resolves to an error in a predictable, bounded time on mobile.
export const REQUEST_TIMEOUT_MS = 15_000

export const RETRY_MAX_ATTEMPTS = 3          // 1 initial + 2 retries
const RETRY_BASE_DELAY_MS = 400
const RETRY_BACKOFF_FACTOR = 3               // base delays 400ms, 1200ms (±50% jitter)
const SAFE_METHODS = new Set(['get', 'head', 'options'])

function isRetryableTransportError(error: unknown): boolean {
    if (!(error instanceof AxiosError)) return false
    if (error.response) return false                       // got an HTTP status → not transport
    if (error.code === 'ERR_CANCELED') return false        // user/abort cancelled
    const method = error.config?.method?.toLowerCase() ?? ''
    return SAFE_METHODS.has(method)
}

function backoffDelay(attempt: number): number {
    const base = RETRY_BASE_DELAY_MS * RETRY_BACKOFF_FACTOR ** (attempt - 1)
    return base * (0.5 + Math.random())                    // ±50% jitter
}

async function withTransportRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown
    for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
        try {
            return await operation()
        } catch (error) {
            lastError = error
            if (attempt === RETRY_MAX_ATTEMPTS || !isRetryableTransportError(error)) {
                throw error
            }
            await new Promise(resolve => setTimeout(resolve, backoffDelay(attempt)))
        }
    }
    throw lastError
}

export function createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
        baseURL: getEnv('VITE_GATEWAY_URL'),
        withCredentials: true,
        timeout: REQUEST_TIMEOUT_MS,
    })

    instance.interceptors.response.use(
        (response) => response,
        (error: unknown) => {
            if (error instanceof AxiosError && error.response) {
                if (error.response.status === 401) {
                    window.location.href = webSiteLink('/login')
                    return new Promise(() => {}) // never resolves — navigation takes over
                }
                if (error.response.status === 417) {
                    return Promise.reject(new CsrfError(error))
                }
            }
            return Promise.reject(error)
        },
    )

    return instance
}

async function refreshCsrfToken(instance: AxiosInstance): Promise<boolean> {
    try {
        const response = await instance.get('/csrf')
        return response.status === 200
    } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 401) {
            return false
        }
        return Promise.reject(error)
    }
}

/**
 * Wraps an API call with automatic CSRF retry on 417 responses.
 * On first CsrfError: refreshes the CSRF token via GET /csrf and retries once.
 * On failed refresh or second failure: redirects to login page.
 *
 * @param fn - receives an axios instance and returns a promise
 * @param instanceFactory - override for testing
 */
export async function apiCall<T>(
    fn: (client: AxiosInstance) => Promise<T>,
    instanceFactory: () => AxiosInstance = createAxiosInstance,
): Promise<T> {
    const instance = instanceFactory()

    return withTransportRetry(async () => {
        try {
            return await fn(instance)
        } catch (error) {
            // Do not attempt CSRF retry for safe methods
            if (
                error instanceof AxiosError &&
                ['GET', 'OPTIONS'].includes(error.config?.method?.toUpperCase() ?? '')
            ) {
                return Promise.reject(error)
            }

            if (!(error instanceof CsrfError)) {
                return Promise.reject(error)
            }

            // Attempt CSRF token refresh then retry
            let refreshed: boolean
            try {
                refreshed = await refreshCsrfToken(instance)
            } catch (refreshError) {
                window.location.reload()
                return Promise.reject(refreshError)
            }

            if (refreshed) {
                return fn(instance)
            }

            // Refresh returned false (401) — auth expired
            window.location.href = webSiteLink('/login')
            return Promise.reject(new Error('CSRF refresh failed — redirecting to login'))
        }
    })
}
