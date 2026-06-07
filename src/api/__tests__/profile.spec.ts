import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosInstance } from 'axios'

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))

vi.mock('../client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../client')>()
    return { ...actual, apiCall: vi.fn((fn: (c: AxiosInstance) => Promise<unknown>) => fn(mockAxios)) }
})

const mockAxios = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance

import {
    getProfile, updateProfile, checkNickName, getSocial, uploadPhoto, updateLocale,
    getChargesFlowStats, getCounterStats, getLatestWallets,
} from '../profile'
import { User } from '../models/user'
import { Currency } from '../models/currency'
import { Wallet } from '../models/wallet'

const rawUser = {
    id: 1, name: 'Jane', lastName: 'Doe', nickName: 'jane', email: 'jane@test.com',
    isEmailConfirmed: true, photoUrl: null, defaultCurrencyCode: 'USD', defaultCurrency: null,
    locale: 'en', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z',
}

const rawWallet = {
    id: 1, name: 'Main', slug: 'main', totalAmount: 500, isActive: true,
    isPublic: false, isArchived: false, defaultCurrencyCode: 'USD', defaultCurrency: null,
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z',
    users: [], latestCharges: [],
}

const rawCurrency = { id: 'usd', code: 'USD', name: 'US Dollar', char: '$', rate: 1.0, updatedAt: '2024-01-01T00:00:00Z' }

describe('getProfile', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/profile and returns User', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: rawUser } })

        const result = await getProfile()

        expect(mockAxios.get).toHaveBeenCalledWith('/api/profile')
        expect(result).toBeInstanceOf(User)
        expect(result.email).toBe('jane@test.com')
        expect(result.locale).toBe('en')
    })
})

describe('updateProfile', () => {
    beforeEach(() => vi.clearAllMocks())

    it('puts profile data to /api/profile and returns updated User', async () => {
        mockAxios.put = vi.fn().mockResolvedValue({ data: { data: rawUser } })

        const request = { name: 'Jane', lastName: 'Doe', nickName: 'jane', defaultCurrencyCode: 'USD', locale: 'en' }
        const result = await updateProfile(request)

        expect(mockAxios.put).toHaveBeenCalledWith('/api/profile', request)
        expect(result).toBeInstanceOf(User)
    })
})

describe('checkNickName', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts nickName to /api/profile/check/nick-name', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: {} })

        await checkNickName('jane_doe')

        expect(mockAxios.post).toHaveBeenCalledWith('/api/profile/check/nick-name', { nickName: 'jane_doe' })
    })
})

describe('getSocial', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/profile/social and returns connected providers', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: { google: true } } })

        const result = await getSocial()

        expect(mockAxios.get).toHaveBeenCalledWith('/api/profile/social')
        expect(result.google).toBe(true)
    })

    it('defaults google to false when the flag is absent', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: {} } })

        const result = await getSocial()

        expect(result.google).toBe(false)
    })
})

describe('uploadPhoto', () => {
    beforeEach(() => vi.clearAllMocks())

    it('puts FormData to /api/profile/photo with multipart header and returns upload response', async () => {
        const responseData = { message: 'ok', fileName: 'photo.jpg', url: 'https://cdn.test/photo.jpg' }
        mockAxios.put = vi.fn().mockResolvedValue({ data: responseData })

        const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
        const result = await uploadPhoto(file)

        expect(mockAxios.put).toHaveBeenCalledWith(
            '/api/profile/photo',
            expect.any(FormData),
            { headers: { 'Content-Type': 'multipart/form-data' } },
        )
        expect(result.url).toBe('https://cdn.test/photo.jpg')
        expect(result.fileName).toBe('photo.jpg')
    })
})

describe('updateLocale', () => {
    beforeEach(() => vi.clearAllMocks())

    it('puts locale to /api/profile/locale and returns User', async () => {
        mockAxios.put = vi.fn().mockResolvedValue({ data: { data: { ...rawUser, locale: 'uk' } } })

        const result = await updateLocale('uk')

        expect(mockAxios.put).toHaveBeenCalledWith('/api/profile/locale', { locale: 'uk' })
        expect(result).toBeInstanceOf(User)
        expect(result.locale).toBe('uk')
    })
})

describe('getChargesFlowStats', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/profile/statistics/charges-flow and returns parsed stats', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({
            data: {
                data: {
                    '+': { type: '+', total: 3000.5, lastYear: 2000, lastQuarter: 800, lastMonth: 200.5 },
                    '-': { type: '-', total: 1200.0, lastYear: 900, lastQuarter: 200, lastMonth: 100 },
                    currency: rawCurrency,
                },
            },
        })

        const result = await getChargesFlowStats()

        expect(mockAxios.get).toHaveBeenCalledWith('/api/profile/statistics/charges-flow')
        expect(result.income.total).toBe(3000.5)
        expect(result.income.lastMonth).toBe(200.5)
        expect(result.expense.total).toBe(1200.0)
        expect(result.expense.lastQuarter).toBe(200)
        expect(result.currency).toBeInstanceOf(Currency)
        expect(result.currency?.code).toBe('USD')
    })

    it('returns null currency when not present', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({
            data: { data: {} },
        })

        const result = await getChargesFlowStats()

        expect(result.currency).toBeNull()
        expect(result.income.total).toBe(0)
        expect(result.expense.total).toBe(0)
    })
})

describe('getCounterStats', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/profile/statistics/counters and returns parsed counters', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({
            data: { data: { wallets: 3, walletsArchived: 1, charges: 150, chargesIncome: 40 } },
        })

        const result = await getCounterStats()

        expect(mockAxios.get).toHaveBeenCalledWith('/api/profile/statistics/counters')
        expect(result.wallets).toBe(3)
        expect(result.walletsArchived).toBe(1)
        expect(result.charges).toBe(150)
        expect(result.chargesIncome).toBe(40)
    })
})

describe('getLatestWallets', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/profile/wallets/latest and returns Wallet[]', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [rawWallet] } })

        const result = await getLatestWallets()

        expect(mockAxios.get).toHaveBeenCalledWith('/api/profile/wallets/latest')
        expect(result).toHaveLength(1)
        expect(result[0]).toBeInstanceOf(Wallet)
        expect(result[0].name).toBe('Main')
    })
})
