import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosInstance } from 'axios'

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))

vi.mock('../client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../client')>()
    return { ...actual, apiCall: vi.fn((fn: (c: AxiosInstance) => Promise<unknown>) => fn(mockAxios)) }
})

const mockAxios = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance

import { getCurrencies, getFeaturedCurrencies } from '../currency'
import { Currency } from '../models/currency'

const rawCurrency = {
    id: 'usd',
    code: 'USD',
    name: 'US Dollar',
    char: '$',
    rate: 1.0,
    updatedAt: '2024-01-01T00:00:00Z',
}

describe('getCurrencies', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/currencies and returns Currency[]', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [rawCurrency] } })

        const result = await getCurrencies()

        expect(mockAxios.get).toHaveBeenCalledWith('/api/currencies')
        expect(result).toHaveLength(1)
        expect(result[0]).toBeInstanceOf(Currency)
        expect(result[0].code).toBe('USD')
        expect(result[0].char).toBe('$')
        expect(result[0].rate).toBe(1.0)
    })
})

describe('getFeaturedCurrencies', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/currencies/featured and returns Currency[]', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [rawCurrency] } })

        const result = await getFeaturedCurrencies()

        expect(mockAxios.get).toHaveBeenCalledWith('/api/currencies/featured')
        expect(result[0]).toBeInstanceOf(Currency)
        expect(result[0].id).toBe('usd')
    })
})
