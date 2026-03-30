import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosInstance } from 'axios'

vi.mock('@/shared/links', () => ({
    webSiteLink: (path: string) => `https://website.test${path}`,
}))

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

import {
    getWallets, getUnarchived, getArchived, getWallet,
    createWallet, updateWallet, deleteWallet,
    activateWallet, archiveWallet, unarchiveWallet,
    getWalletTotals, sortWallets, getWalletUsers, shareWallet, unshareWallet,
} from '../wallets'
import { Wallet, WalletTotal } from '../models/wallet'
import { User } from '../models/user'

const rawWallet = {
    id: 1, name: 'My Wallet', slug: 'my-wallet', totalAmount: 100.5,
    isActive: true, isPublic: false, isArchived: false,
    defaultCurrencyCode: 'USD', defaultCurrency: null,
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z',
    users: [], latestCharges: [],
}

const rawUser = {
    id: 5, name: 'Bob', lastName: null, nickName: 'bob', photoUrl: null,
    email: 'bob@example.com', isEmailConfirmed: true, defaultCurrencyCode: null,
    defaultCurrency: null, locale: 'en', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z',
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

describe('getUnarchived', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/wallets/unarchived and returns Wallet[]', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [rawWallet] } })

        const result = await getUnarchived()

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets/unarchived')
        expect(result[0]).toBeInstanceOf(Wallet)
    })
})

describe('getArchived', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/wallets/archived and returns Wallet[]', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [] } })

        const result = await getArchived()

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets/archived')
        expect(result).toEqual([])
    })
})

describe('getWallet', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/wallets/{id} and returns single Wallet', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: rawWallet } })

        const result = await getWallet(1)

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets/1')
        expect(result).toBeInstanceOf(Wallet)
        expect(result.slug).toBe('my-wallet')
    })
})

describe('createWallet', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts to /api/wallets with request body and returns Wallet', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: { data: rawWallet } })

        const request = { name: 'My Wallet', slug: 'my-wallet', isPublic: false, defaultCurrencyCode: 'USD' }
        const result = await createWallet(request)

        expect(mockAxios.post).toHaveBeenCalledWith('/api/wallets', request)
        expect(result).toBeInstanceOf(Wallet)
        expect(result.slug).toBe('my-wallet')
        expect(result.isPublic).toBe(false)
    })
})

describe('updateWallet', () => {
    beforeEach(() => vi.clearAllMocks())

    it('puts to /api/wallets/{id} and returns updated Wallet', async () => {
        const updated = { ...rawWallet, name: 'Renamed' }
        mockAxios.put = vi.fn().mockResolvedValue({ data: { data: updated } })

        const request = { name: 'Renamed', isPublic: true, defaultCurrencyCode: 'EUR' }
        const result = await updateWallet(1, request)

        expect(mockAxios.put).toHaveBeenCalledWith('/api/wallets/1', request)
        expect(result.name).toBe('Renamed')
    })
})

describe('deleteWallet', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls DELETE /api/wallets/{id}', async () => {
        mockAxios.delete = vi.fn().mockResolvedValue({ data: {} })

        await deleteWallet(1)

        expect(mockAxios.delete).toHaveBeenCalledWith('/api/wallets/1')
    })
})

describe('activateWallet', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls POST /api/wallets/{id}/activate', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: {} })

        await activateWallet(1)

        expect(mockAxios.post).toHaveBeenCalledWith('/api/wallets/1/activate')
    })
})

describe('archiveWallet', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls POST /api/wallets/{id}/archive', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: {} })

        await archiveWallet(1)

        expect(mockAxios.post).toHaveBeenCalledWith('/api/wallets/1/archive')
    })
})

describe('unarchiveWallet', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls POST /api/wallets/{id}/un-archive', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: {} })

        await unarchiveWallet(1)

        expect(mockAxios.post).toHaveBeenCalledWith('/api/wallets/1/un-archive')
    })
})

describe('getWalletTotals', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/wallets/{id}/total and returns WalletTotal', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({
            data: { data: { totalAmount: 500, totalIncomeAmount: 800, totalExpenseAmount: 300, tags: [] } },
        })

        const result = await getWalletTotals(1)

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets/1/total')
        expect(result).toBeInstanceOf(WalletTotal)
        expect(result.totalAmount).toBe(500)
        expect(result.totalIncomeAmount).toBe(800)
        expect(result.totalExpenseAmount).toBe(300)
    })
})

describe('sortWallets', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts sort order to /api/wallets/unarchived/sort', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: {} })

        await sortWallets([3, 1, 2])

        expect(mockAxios.post).toHaveBeenCalledWith('/api/wallets/unarchived/sort', { sort: [3, 1, 2] })
    })
})

describe('getWalletUsers', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/wallets/{id}/users and returns User[]', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [rawUser] } })

        const result = await getWalletUsers(1)

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets/1/users')
        expect(result[0]).toBeInstanceOf(User)
        expect(result[0].id).toBe(5)
    })
})

describe('shareWallet', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls PATCH /api/wallets/{walletId}/users/{userId}', async () => {
        mockAxios.patch = vi.fn().mockResolvedValue({ data: {} })

        await shareWallet(1, 5)

        expect(mockAxios.patch).toHaveBeenCalledWith('/api/wallets/1/users/5')
    })
})

describe('unshareWallet', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls DELETE /api/wallets/{walletId}/users/{userId}', async () => {
        mockAxios.delete = vi.fn().mockResolvedValue({ data: {} })

        await unshareWallet(1, 5)

        expect(mockAxios.delete).toHaveBeenCalledWith('/api/wallets/1/users/5')
    })
})
