import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios, { AxiosError, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import {
    apiCall,
    CsrfError,
    createAxiosInstance,
    MalformedResponseError,
    REQUEST_TIMEOUT_MS,
    RETRY_MAX_ATTEMPTS,
} from '../client'

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

// Swaps the adapter on a real createAxiosInstance so responses pass through axios'
// own JSON transform before reaching the interceptors, as they do in the browser.
function instanceWithResponses(responses: Array<Partial<AxiosResponse>>): {
    instance: AxiosInstance
    attempts: () => number
} {
    const instance = createAxiosInstance()
    let attempts = 0
    instance.defaults.adapter = async (config) => {
        const spec = responses[Math.min(attempts, responses.length - 1)]
        attempts++
        return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: undefined,
            ...spec,
            config,
        } as AxiosResponse
    }
    return { instance, attempts: () => attempts }
}

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }
const PROFILE_BODY = '{"data":{"id":1,"name":"Jane"}}'

describe('malformed response detection', () => {
    it('rejects a 200 JSON response whose body never arrived', async () => {
        const { instance } = instanceWithResponses([{ headers: JSON_HEADERS, data: '' }])

        const caught = await instance.get('/api/profile').catch((e: unknown) => e)

        expect(caught).toBeInstanceOf(MalformedResponseError)
        expect((caught as MalformedResponseError).message).toContain('empty body on a JSON response')
        expect((caught as MalformedResponseError).status).toBe(200)
        expect((caught as MalformedResponseError).method).toBe('get')
    })

    it('rejects a 200 JSON response whose body was cut short', async () => {
        const { instance } = instanceWithResponses([{ headers: JSON_HEADERS, data: '{"data":{"id":1,' }])

        const caught = await instance.get('/api/profile').catch((e: unknown) => e)

        expect(caught).toBeInstanceOf(MalformedResponseError)
        expect((caught as MalformedResponseError).message).toContain('unparseable JSON body')
    })

    it('attaches the response trace id to the error', async () => {
        const { instance } = instanceWithResponses([
            { headers: { ...JSON_HEADERS, 'x-ct-trace-id': 'trace-truncated' }, data: '' },
        ])

        const caught = await instance.get('/api/profile').catch((e: unknown) => e)

        expect((caught as Record<string, unknown>).ctTraceId).toBe('trace-truncated')
    })

    it('accepts an empty 200 with no content type (Spiral $response->create(200))', async () => {
        // DELETE wallet/tag/limit/charge and PATCH wallet user all answer this way.
        const { instance } = instanceWithResponses([{ headers: {}, data: '' }])

        await expect(instance.delete('/api/wallets/1')).resolves.toMatchObject({ status: 200 })
    })

    it('accepts an empty 200 with a text content type (gateway /csrf, /live)', async () => {
        const { instance } = instanceWithResponses([
            { headers: { 'content-type': 'text/plain; charset=utf-8' }, data: '' },
        ])

        await expect(instance.get('/csrf')).resolves.toMatchObject({ status: 200 })
    })

    it('accepts a well-formed JSON body', async () => {
        const { instance } = instanceWithResponses([{ headers: JSON_HEADERS, data: PROFILE_BODY }])

        const response = await instance.get('/api/profile')

        expect(response.data).toEqual({ data: { id: 1, name: 'Jane' } })
    })

    it('leaves a non-json responseType alone even when the body is a string', async () => {
        const { instance } = instanceWithResponses([{ headers: JSON_HEADERS, data: '' }])

        await expect(instance.get('/api/export', { responseType: 'text' })).resolves.toMatchObject({ status: 200 })
    })

    it('does not flag a HEAD request, which has no body by definition', async () => {
        const { instance } = instanceWithResponses([{ headers: JSON_HEADERS, data: '' }])

        await expect(instance.head('/api/profile')).resolves.toMatchObject({ status: 200 })
    })
})

describe('malformed response retry (via apiCall)', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    it('retries a GET whose body was lost and succeeds on the next attempt', async () => {
        const { instance, attempts } = instanceWithResponses([
            { headers: JSON_HEADERS, data: '' },
            { headers: JSON_HEADERS, data: PROFILE_BODY },
        ])

        const promise = apiCall(async (client) => {
            const res = await client.get('/api/profile')
            return res.data.data
        }, () => instance)
        await vi.runAllTimersAsync()

        await expect(promise).resolves.toEqual({ id: 1, name: 'Jane' })
        expect(attempts()).toBe(2)
    })

    it('gives up after RETRY_MAX_ATTEMPTS when the body never arrives', async () => {
        const { instance, attempts } = instanceWithResponses([{ headers: JSON_HEADERS, data: '' }])

        const promise = apiCall((client) => client.get('/api/profile'), () => instance)
        const assertion = expect(promise).rejects.toBeInstanceOf(MalformedResponseError)
        await vi.runAllTimersAsync()
        await assertion

        expect(attempts()).toBe(RETRY_MAX_ATTEMPTS)
    })

    it('does NOT retry a POST whose body was lost — the write may have landed', async () => {
        const { instance, attempts } = instanceWithResponses([{ headers: JSON_HEADERS, data: '' }])

        const promise = apiCall((client) => client.post('/api/wallets', { name: 'Main' }), () => instance)
        const assertion = expect(promise).rejects.toBeInstanceOf(MalformedResponseError)
        await vi.runAllTimersAsync()
        await assertion

        expect(attempts()).toBe(1)
    })

    it('recovers the incident case: a model parser no longer sees an undefined payload', async () => {
        // 2026-07-22: /api/profile answered 200 with a lost body, so User.from threw a
        // plain Error on undefined and withTransportRetry refused to retry it.
        const { instance } = instanceWithResponses([
            { headers: JSON_HEADERS, data: '' },
            { headers: JSON_HEADERS, data: PROFILE_BODY },
        ])

        const promise = apiCall(async (client) => {
            const res = await client.get('/api/profile')
            if (!res.data.data || typeof res.data.data !== 'object') {
                throw new Error('User.from: expected object')
            }
            return res.data.data
        }, () => instance)
        await vi.runAllTimersAsync()

        await expect(promise).resolves.toEqual({ id: 1, name: 'Jane' })
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
})
