import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios, { AxiosError, type AxiosInstance, type AxiosResponse } from 'axios'
import { apiCall, CsrfError } from '../client'

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

    it('does not retry GET requests even on CsrfError-like errors', async () => {
        const getError = Object.assign(new AxiosError('err'), {
            config: { method: 'GET' },
        })
        const fn = vi.fn().mockRejectedValue(getError)

        await expect(
            apiCall(fn, () => mockInstance()),
        ).rejects.toThrow()

        expect(fn).toHaveBeenCalledTimes(1)
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
