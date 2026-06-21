import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosInstance } from 'axios'

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))

vi.mock('../client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../client')>()
    return { ...actual, apiCall: vi.fn((fn: (c: AxiosInstance) => Promise<unknown>) => fn(mockAxios)) }
})

const mockAxios = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance

import { login, register, logout, refreshToken, loginPasskeyInit, loginPasskey, loginGoogle } from '../auth'

const redirectResponse = { redirectUrl: 'https://app.test/dashboard' }

describe('login', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts credentials to /api/auth/login and returns redirectUrl', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: redirectResponse })

        const result = await login({ email: 'user@test.com', password: 'secret' })

        expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/login', {
            email: 'user@test.com',
            password: 'secret',
        })
        expect(result.redirectUrl).toBe('https://app.test/dashboard')
    })
})

describe('register', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts registration data to /api/auth/register and returns redirectUrl', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: redirectResponse })

        const request = {
            name: 'Jane',
            lastName: 'Doe',
            nickName: 'jane',
            email: 'jane@test.com',
            password: 'secret123',
            passwordConfirmation: 'secret123',
            locale: 'en',
        }

        const result = await register(request)

        expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/register', request)
        expect(result.redirectUrl).toBe('https://app.test/dashboard')
    })
})

describe('logout', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts to /api/auth/logout and returns redirectUrl', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: { redirectUrl: 'https://website.test' } })

        const result = await logout()

        expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/logout')
        expect(result.redirectUrl).toBe('https://website.test')
    })
})

describe('refreshToken', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts to /api/auth/refresh', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: {} })

        await refreshToken()

        expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/refresh')
    })
})

describe('loginPasskeyInit', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/auth/login/passkey/init and returns raw response', async () => {
        const options = { challenge: 'abc123', timeout: 60000 }
        mockAxios.get = vi.fn().mockResolvedValue({ data: options })

        const result = await loginPasskeyInit()

        expect(mockAxios.get).toHaveBeenCalledWith('/api/auth/login/passkey/init')
        expect(result).toEqual(options)
    })
})

describe('loginPasskey', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts passkey assertion to /api/auth/login/passkey and returns redirectUrl', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: redirectResponse })

        const request = { challenge: 'abc123', data: 'base64encodeddata' }
        const result = await loginPasskey(request)

        expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/login/passkey', request)
        expect(result.redirectUrl).toBe('https://app.test/dashboard')
    })
})

describe('loginGoogle', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts Google token to /api/auth/provider/google and returns redirectUrl', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: redirectResponse })

        const result = await loginGoogle('google-id-token')

        expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/provider/google', {
            token: 'google-id-token',
        })
        expect(result.redirectUrl).toBe('https://app.test/dashboard')
    })
})
