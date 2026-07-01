import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios, { AxiosError, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { apiCall, CsrfError, createAxiosInstance, REQUEST_TIMEOUT_MS, RETRY_MAX_ATTEMPTS } from '../client'

vi.mock('@/shared/links', () => ({
    webSiteLink: (path: string) => `https://website.test${path}`,
}))

// Minimal AxiosInstance mock factory
function mockInstance(overrides: Partial<AxiosInstance> = {}): AxiosInstance {
    return {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
        ...overrides,
    } as unknown as AxiosInstance
}

// AxiosInstance mock whose interceptors.response.use actually stores fulfilled
// handlers, so a test can simulate a real response passing through them —
// needed to exercise apiCall's trace-id-capturing interceptor.
function mockInstanceWithInterceptors(overrides: Partial<AxiosInstance> = {}): {
    instance: AxiosInstance
    emitResponse: (response: AxiosResponse) => void
} {
    const fulfilledHandlers: Array<(response: AxiosResponse) => AxiosResponse> = []
    const instance = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
            request: { use: vi.fn() },
            response: {
                use: vi.fn((onFulfilled?: (response: AxiosResponse) => AxiosResponse) => {
                    if (onFulfilled) fulfilledHandlers.push(onFulfilled)
                }),
            },
        },
        ...overrides,
    } as unknown as AxiosInstance

    return {
        instance,
        emitResponse: (response: AxiosResponse) => {
            for (const handler of fulfilledHandlers) handler(response)
        },
    }
}

describe('apiCall', () => {
    let originalHref: string
    let originalReload: () => void

    beforeEach(() => {
        originalHref = window.location.href
        originalReload = window.location.reload
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { href: '', reload: vi.fn() },
        })
    })

    afterEach(() => {
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { href: originalHref, reload: originalReload },
        })
        vi.clearAllMocks()
    })

    it('returns resolved value on success', async () => {
        const result = await apiCall(
            () => Promise.resolve('ok' as unknown as AxiosResponse),
            () => mockInstance(),
        )
        expect(result).toBe('ok')
    })

    it('propagates non-CSRF errors unchanged', async () => {
        const err = new Error('network failure')
        await expect(
            apiCall(
                () => Promise.reject(err),
                () => mockInstance(),
            ),
        ).rejects.toThrow('network failure')
    })

    it('retries once after CsrfError and returns result on second call', async () => {
        let callCount = 0
        const fn = vi.fn().mockImplementation(async () => {
            callCount++
            if (callCount === 1) throw new CsrfError(new Error('CSRF mismatch'))
            return 'retried'
        })

        const instance = mockInstance({
            get: vi.fn().mockResolvedValue({ status: 200 }),
        })

        const result = await apiCall(fn, () => instance)
        expect(result).toBe('retried')
        expect(fn).toHaveBeenCalledTimes(2)
        expect(instance.get).toHaveBeenCalledWith('/csrf')
    })

    it('redirects to login when CSRF refresh returns 401', async () => {
        const fn = vi.fn().mockRejectedValue(new CsrfError(new Error('CSRF')))

        const csrfError = Object.assign(new AxiosError('Unauthorized'), {
            response: { status: 401 } as AxiosResponse,
        })
        const instance = mockInstance({
            get: vi.fn().mockRejectedValue(csrfError),
        })

        await expect(apiCall(fn, () => instance)).rejects.toThrow('redirecting to login')
        expect(window.location.href).toBe('https://website.test/login')
    })

    it('reloads page when CSRF refresh throws unexpected error', async () => {
        const fn = vi.fn().mockRejectedValue(new CsrfError(new Error('CSRF')))
        const instance = mockInstance({
            get: vi.fn().mockRejectedValue(new Error('Redis down')),
        })

        await expect(apiCall(fn, () => instance)).rejects.toThrow('Redis down')
        expect(window.location.reload).toHaveBeenCalled()
    })

    it('does not apply CSRF retry to GET requests with an HTTP response error', async () => {
        // A GET that gets an HTTP response (e.g. 403) — not a transport error,
        // so withTransportRetry also skips it. The CSRF branch must not trigger.
        const getError = Object.assign(new AxiosError('Forbidden'), {
            config: { method: 'GET' },
            response: { status: 403 } as AxiosResponse,
        })
        const fn = vi.fn().mockRejectedValue(getError)

        await expect(
            apiCall(fn, () => mockInstance()),
        ).rejects.toThrow('Forbidden')

        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('attaches ctTraceId from error.response.headers for a non-CSRF AxiosError with a response', async () => {
        const err = Object.assign(new AxiosError('Forbidden'), {
            config: { method: 'POST' },
            response: { status: 403, headers: { 'x-ct-trace-id': 'trace-403' } } as unknown as AxiosResponse,
        })
        const fn = vi.fn().mockRejectedValue(err)

        const caught = await apiCall(fn, () => mockInstance()).catch((e: unknown) => e)
        expect((caught as Record<string, unknown>).ctTraceId).toBe('trace-403')
    })

    it('attaches ctTraceId to a plain Error thrown after a successful response (model-parser case)', async () => {
        const { instance, emitResponse } = mockInstanceWithInterceptors()
        const fn = vi.fn().mockImplementation(async () => {
            emitResponse({ headers: { 'x-ct-trace-id': 'trace-parser-1' } } as unknown as AxiosResponse)
            throw new Error('User.from: expected object')
        })

        const caught = await apiCall(fn, () => instance).catch((e: unknown) => e)
        expect(caught).toBeInstanceOf(Error)
        expect((caught as Record<string, unknown>).ctTraceId).toBe('trace-parser-1')
    })
})

describe('createAxiosInstance — timeout', () => {
    it('sets timeout to REQUEST_TIMEOUT_MS', () => {
        const instance = createAxiosInstance()
        expect(instance.defaults.timeout).toBe(REQUEST_TIMEOUT_MS)
    })
})

// Helper to build an AxiosError shaped like a transport error (no response)
function makeTransportError(code: string, method: string): AxiosError {
    const err = new AxiosError('network error', code)
    err.config = { method } as InternalAxiosRequestConfig
    return err
}

// Helper to build an AxiosError shaped like an HTTP response error
function makeResponseError(status: number, method = 'get'): AxiosError {
    const err = new AxiosError(`Request failed with status code ${status}`)
    err.response = { status } as AxiosResponse
    err.config = { method } as InternalAxiosRequestConfig
    return err
}

describe('withTransportRetry (via apiCall)', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    it('retries a GET ECONNABORTED transport error and succeeds on attempt 2', async () => {
        let callCount = 0
        const fn = vi.fn().mockImplementation(async () => {
            callCount++
            if (callCount === 1) throw makeTransportError('ECONNABORTED', 'get')
            return 'success'
        })

        const promise = apiCall(fn, () => mockInstance())
        // advance timers to resolve the backoff delay
        await vi.runAllTimersAsync()
        const result = await promise
        expect(result).toBe('success')
        expect(fn).toHaveBeenCalledTimes(2)
    })

    it('does NOT retry a 500 response error', async () => {
        const fn = vi.fn().mockRejectedValue(makeResponseError(500))
        // Attach .rejects before advancing timers to prevent unhandled rejection
        const assertion = expect(apiCall(fn, () => mockInstance())).rejects.toThrow()
        await vi.runAllTimersAsync()
        await assertion
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('does NOT retry a POST transport error', async () => {
        const fn = vi.fn().mockRejectedValue(makeTransportError('ECONNABORTED', 'post'))
        const assertion = expect(apiCall(fn, () => mockInstance())).rejects.toThrow()
        await vi.runAllTimersAsync()
        await assertion
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('does NOT retry an ERR_CANCELED error', async () => {
        const fn = vi.fn().mockRejectedValue(makeTransportError('ERR_CANCELED', 'get'))
        const assertion = expect(apiCall(fn, () => mockInstance())).rejects.toThrow()
        await vi.runAllTimersAsync()
        await assertion
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('does NOT retry a CsrfError (even though it has no response)', async () => {
        // CsrfError is not an AxiosError, isRetryableTransportError returns false;
        // it falls through to the CSRF path which needs a mock instance with get()
        const fn = vi.fn().mockRejectedValue(new CsrfError(new Error('csrf')))
        const csrfRefreshError = Object.assign(new AxiosError('Unauthorized'), {
            response: { status: 401 } as AxiosResponse,
        })
        const instance = mockInstance({
            get: vi.fn().mockRejectedValue(csrfRefreshError),
        })
        const assertion = expect(apiCall(fn, () => instance)).rejects.toThrow()
        await vi.runAllTimersAsync()
        await assertion
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('stops after RETRY_MAX_ATTEMPTS and rethrows the last error', async () => {
        const transportErr = makeTransportError('ECONNABORTED', 'get')
        const fn = vi.fn().mockRejectedValue(transportErr)
        const assertion = expect(apiCall(fn, () => mockInstance())).rejects.toBe(transportErr)
        await vi.runAllTimersAsync()
        await assertion
        expect(fn).toHaveBeenCalledTimes(RETRY_MAX_ATTEMPTS)
    })
})

describe('CsrfError', () => {
    it('has name CsrfError', () => {
        const err = new CsrfError(new Error('cause'))
        expect(err.name).toBe('CsrfError')
        expect(err instanceof CsrfError).toBe(true)
    })

    it('is not an instance of AxiosError', () => {
        const err = new CsrfError(new Error('x'))
        expect(err instanceof axios.AxiosError).toBe(false)
    })

    it('stamps ctTraceId from the originating AxiosError response headers', () => {
        const cause = Object.assign(new AxiosError('CSRF mismatch'), {
            response: { status: 417, headers: { 'x-ct-trace-id': 'trace-417' } } as unknown as AxiosResponse,
        })
        const err = new CsrfError(cause)
        expect(err.ctTraceId).toBe('trace-417')
    })

    it('leaves ctTraceId undefined when cause is a plain Error', () => {
        const err = new CsrfError(new Error('cause'))
        expect(err.ctTraceId).toBeUndefined()
    })
})
