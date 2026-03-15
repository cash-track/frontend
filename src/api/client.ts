import axios, { AxiosError, type AxiosInstance } from 'axios'
import { webSiteLink } from '@/shared/links'

export class CsrfError extends Error {
    constructor(cause: Error) {
        super(cause.message)
        this.name = 'CsrfError'
        this.stack = cause.stack
    }
}

export function createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
        baseURL: import.meta.env.VITE_GATEWAY_URL,
        withCredentials: true,
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
}
