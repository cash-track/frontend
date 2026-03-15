import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosInstance } from 'axios'

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))

vi.mock('../client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../client')>()
    return { ...actual, apiCall: vi.fn((fn: (c: AxiosInstance) => Promise<unknown>) => fn(mockAxios)) }
})

const mockAxios = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance

import { updatePassword, forgotPassword, resetPassword } from '../profile/password'

describe('updatePassword', () => {
    beforeEach(() => vi.clearAllMocks())

    it('puts password fields to /api/profile/password', async () => {
        mockAxios.put = vi.fn().mockResolvedValue({ data: {} })

        const request = { currentPassword: 'old', newPassword: 'new123', newPasswordConfirmation: 'new123' }
        await updatePassword(request)

        expect(mockAxios.put).toHaveBeenCalledWith('/api/profile/password', request)
    })
})

describe('forgotPassword', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts email to /api/auth/password/forgot and returns message', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: { message: 'Reset email sent' } })

        const result = await forgotPassword({ email: 'jane@test.com' })

        expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/password/forgot', { email: 'jane@test.com' })
        expect(result).toBe('Reset email sent')
    })
})

describe('resetPassword', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts reset data to /api/auth/password/reset and returns message', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: { message: 'Password changed' } })

        const request = { code: 'reset-code', email: 'jane@test.com', password: 'new123', passwordConfirmation: 'new123' }
        const result = await resetPassword(request)

        expect(mockAxios.post).toHaveBeenCalledWith('/api/auth/password/reset', request)
        expect(result).toBe('Password changed')
    })
})
