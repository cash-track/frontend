import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosInstance } from 'axios'

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))

vi.mock('../client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../client')>()
    return { ...actual, apiCall: vi.fn((fn: (c: AxiosInstance) => Promise<unknown>) => fn(mockAxios)) }
})

const mockAxios = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance

import { findUserByEmail, findUsersByCommonWallets } from '../users'
import { User } from '../models/user'

const rawUser = {
    id: 5, name: 'Jane', lastName: 'Doe', nickName: 'jane', photoUrl: null,
    email: 'jane@example.com', isEmailConfirmed: true, defaultCurrencyCode: 'USD',
    defaultCurrency: null, locale: 'en', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z',
}

describe('findUserByEmail', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/users/find/by-email/{email} and returns User', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: rawUser } })

        const result = await findUserByEmail('jane@example.com')

        expect(mockAxios.get).toHaveBeenCalledWith('/api/users/find/by-email/jane%40example.com')
        expect(result).toBeInstanceOf(User)
        expect(result.id).toBe(5)
        expect(result.nickName).toBe('jane')
    })
})

describe('findUsersByCommonWallets', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/users/find/by-common-wallets and returns User[]', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [rawUser] } })

        const result = await findUsersByCommonWallets()

        expect(mockAxios.get).toHaveBeenCalledWith('/api/users/find/by-common-wallets')
        expect(result).toHaveLength(1)
        expect(result[0]).toBeInstanceOf(User)
        expect(result[0].displayName).toBe('Jane Doe')
    })
})
