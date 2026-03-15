import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosInstance } from 'axios'

vi.mock('@/shared/links', () => ({
    webSiteLink: (path: string) => `https://website.test${path}`,
}))

// Mock apiCall to capture the fn passed to it and call it with a mock instance
vi.mock('../client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../client')>()
    return {
        ...actual,
        apiCall: vi.fn((fn: (client: AxiosInstance) => Promise<unknown>) => fn(mockAxios)),
    }
})

const mockAxios = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
} as unknown as AxiosInstance

import { getWallets, createWallet } from '../wallets'
import { Wallet } from '../models/wallet'

const rawWallet = {
    id: 1,
    name: 'My Wallet',
    slug: 'my-wallet',
    totalAmount: 100.5,
    isActive: true,
    isPublic: false,
    isArchived: false,
    defaultCurrencyCode: 'USD',
    defaultCurrency: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    users: [],
    latestCharges: [],
}

describe('getWallets', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/wallets and returns Wallet[]', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [rawWallet] } })

        const result = await getWallets()

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets')
        expect(result).toHaveLength(1)
        expect(result[0]).toBeInstanceOf(Wallet)
        expect(result[0].id).toBe(1)
        expect(result[0].name).toBe('My Wallet')
        expect(result[0].totalAmount).toBe(100.5)
    })

    it('returns empty array when API returns no wallets', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [] } })

        const result = await getWallets()
        expect(result).toEqual([])
    })
})

describe('createWallet', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts to /api/wallets with request body and returns Wallet', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: { data: rawWallet } })

        const request = {
            name: 'My Wallet',
            slug: 'my-wallet',
            isPublic: false,
            defaultCurrencyCode: 'USD',
        }

        const result = await createWallet(request)

        expect(mockAxios.post).toHaveBeenCalledWith('/api/wallets', request)
        expect(result).toBeInstanceOf(Wallet)
        expect(result.slug).toBe('my-wallet')
        expect(result.isPublic).toBe(false)
    })
})
