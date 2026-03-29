import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosInstance } from 'axios'

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))

vi.mock('../client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../client')>()
    return { ...actual, apiCall: vi.fn((fn: (c: AxiosInstance) => Promise<unknown>) => fn(mockAxios)) }
})

const mockAxios = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance

import { getChargesFlowByDate, getChargesTotalByType } from '../graph'

const rawFlowPoints = [
    { date: '2024-06-01', timestamp: 1717200000, income: 500, expense: 150.5 },
    { date: '2024-06-02', timestamp: 1717286400, income: 0, expense: 0 },
]

const rawTotalPoints = [
    { amount: 5000, tags: [1, 2] },
    { amount: 3000, tags: [] },
]

describe('getChargesFlowByDate', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/wallets/{id}/charges/graph/amount without params', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: rawFlowPoints } })

        const result = await getChargesFlowByDate(2)

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets/2/charges/graph/amount', { params: undefined })
        expect(result).toHaveLength(2)
        expect(result[0].date).toBe('2024-06-01')
        expect(result[0].income).toBe(500)
        expect(result[0].expense).toBe(150.5)
        expect(result[1].income).toBe(0)
    })

    it('passes groupBy param when provided', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [] } })

        await getChargesFlowByDate(2, { groupBy: 'month' })

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets/2/charges/graph/amount', {
            params: { groupBy: 'month' },
        })
    })
})

describe('getChargesTotalByType', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/wallets/{id}/charges/graph/total', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: rawTotalPoints } })

        const result = await getChargesTotalByType(2)

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets/2/charges/graph/total')
        expect(result).toHaveLength(2)
        expect(result[0].amount).toBe(5000)
        expect(result[0].tags).toEqual([1, 2])
        expect(result[1].tags).toEqual([])
    })
})
