import axios, { AxiosError, type AxiosInstance, type AxiosResponse } from 'axios'
import { webSiteLink } from '@/shared/links'
import { getEnv } from '@/shared/env'
import { clearCachedProfile } from '@/shared/profileCookie'

// Axios normalizes response header lookups to lowercase regardless of wire casing.
const TRACE_ID_HEADER = 'x-ct-trace-id'

function extractTraceId(headers: unknown): string | undefined {
    if (!headers || typeof headers !== 'object') return undefined
    const value = (headers as Record<string, unknown>)[TRACE_ID_HEADER]
    return typeof value === 'string' && value.length > 0 ? value : undefined
}

// First writer wins — the failing response's own trace ID beats apiCall's last-seen fallback.
function attachTraceId(error: unknown, traceId: string | undefined): void {
    if (!traceId || !error || typeof error !== 'object') return
    if ((error as { ctTraceId?: unknown }).ctTraceId) return
    Object.assign(error, { ctTraceId: traceId })
}

export class CsrfError extends Error {
    constructor(cause: Error) {
        super(cause.message)
        this.name = 'CsrfError'
        this.stack = cause.stack
    }
}

/**
 * A 2xx response whose body was lost or cut short in transit. XHR reports that as a
 * successful status with an empty payload rather than a network error, so it has to be
 * detected from the body and retried like any other transport failure.
 */
export class MalformedResponseError extends Error {
    readonly status: number
    readonly method: string

    constructor(message: string, response: AxiosResponse) {
        super(message)
        this.name = 'MalformedResponseError'
        this.status = response.status
        this.method = response.config?.method?.toLowerCase() ?? ''
    }
}

const JSON_CONTENT_TYPE = /^application\/([\w.+-]+\+)?json\b/i

function isJsonContentType(headers: unknown): boolean {
    if (!headers || typeof headers !== 'object') return false
    const value = (headers as Record<string, unknown>)['content-type']
    return typeof value === 'string' && JSON_CONTENT_TYPE.test(value.trim())
}

/** Why a successful response is unusable, or null when it is fine. */
function malformedBodyReason(response: AxiosResponse): string | null {
    if (response.config?.method?.toLowerCase() === 'head') return null

    const responseType = response.config?.responseType
    if (responseType !== undefined && responseType !== 'json') return null

    // Gated on the content type: endpoints that legitimately answer with an empty 200
    // (Spiral's $response->create(200), gateway /csrf) declare no content type at all.
    if (!isJsonContentType(response.headers)) return null

    // axios leaves `data` a string only when the body was empty or JSON.parse threw.
    if (typeof response.data !== 'string') return null

    return response.data.length === 0 ? 'empty body on a JSON response' : 'unparseable JSON body'
}

// Per-attempt cap. Kept below the worst-case (attempts × timeout + backoff) so a
// failing request resolves to an error in a predictable, bounded time on mobile.
export const REQUEST_TIMEOUT_MS = 15_000

export const RETRY_MAX_ATTEMPTS = 3          // 1 initial + 2 retries
const RETRY_BASE_DELAY_MS = 400
const RETRY_BACKOFF_FACTOR = 3               // base delays 400ms, 1200ms (±50% jitter)
const SAFE_METHODS = new Set(['get', 'head', 'options'])

function isRetryableTransportError(error: unknown): boolean {
    // Lost body → same idempotency rule as a dropped connection
    if (error instanceof MalformedResponseError) return SAFE_METHODS.has(error.method)
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
        (response) => {
            const reason = malformedBodyReason(response)
            if (reason === null) return response

            const error = new MalformedResponseError(
                `${response.config?.method?.toUpperCase() ?? 'GET'} ${response.config?.url ?? ''}`.trim() +
                    ` returned HTTP ${response.status} with ${reason}`,
                response,
            )
            attachTraceId(error, extractTraceId(response.headers))
            return Promise.reject(error)
        },
        (error: unknown) => {
            if (error instanceof AxiosError && error.response) {
                if (error.response.status === 401) {
                    // Session is dead — drop the display cache so no stale logged-in header.
                    clearCachedProfile()
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

    // Remembers the trace ID of the last successful response on this call, so it's
    // still available if a later step (e.g. response shape parsing) throws a plain
    // Error with no AxiosResponse attached.
    const lastResponseTraceId: { value?: string } = {}
    instance.interceptors.response.use((response) => {
        lastResponseTraceId.value = extractTraceId(response.headers) ?? lastResponseTraceId.value
        return response
    })

    try {
        return await withTransportRetry(async () => {
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
                clearCachedProfile()
                window.location.href = webSiteLink('/login')
                return Promise.reject(new Error('CSRF refresh failed — redirecting to login'))
            }
        })
    } catch (error) {
        const traceId =
            error instanceof AxiosError && error.response
                ? extractTraceId(error.response.headers)
                : lastResponseTraceId.value
        attachTraceId(error, traceId)
        throw error
    }
}
