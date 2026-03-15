import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosInstance } from 'axios'

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))

// profile/email.ts imports '../client' (relative to profile/), which resolves to src/api/client
vi.mock('../client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../client')>()
    return { ...actual, apiCall: vi.fn((fn: (c: AxiosInstance) => Promise<unknown>) => fn(mockAxios)) }
})

const mockAxios = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance

import { getEmailConfirmation, confirmEmail, resendEmailConfirmation } from '../profile/email'

const rawConfirmation = {
    email: 'jane@test.com',
    createdAt: '2024-01-01T00:00:00Z',
    resendTimeLimit: 60,
    validTimeLimit: 3600,
    timeSentAgo: 30,
    isThrottled: false,
    isValid: true,
}

describe('getEmailConfirmation', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/auth/email/confirmation and returns parsed data', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: rawConfirmation } })

        const result = await getEmailConfirmation()

        expect(mockAxios.get).toHaveBeenCalledWith('/api/auth/email/confirmation')
        expect(result.email).toBe('jane@test.com')
        expect(result.resendTimeLimit).toBe(60)
        expect(result.isValid).toBe(true)
        expect(result.isThrottled).toBe(false)
        expect(result.createdAt).toBeInstanceOf(Date)
    })
})

describe('confirmEmail', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/auth/email/confirmation/confirm/{token}', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: {} })

        await confirmEmail('my-confirm-token')

        expect(mockAxios.get).toHaveBeenCalledWith(
            '/api/auth/email/confirmation/confirm/my-confirm-token',
        )
    })
})

describe('resendEmailConfirmation', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts to /api/auth/email/confirmation/resend', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: {} })

        await resendEmailConfirmation()

        expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/email/confirmation/resend')
    })
})
