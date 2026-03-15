import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosInstance } from 'axios'

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))

vi.mock('../client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../client')>()
    return { ...actual, apiCall: vi.fn((fn: (c: AxiosInstance) => Promise<unknown>) => fn(mockAxios)) }
})

const mockAxios = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance

import { getChargesFlowByDate } from '../graph'

const rawDataPoints = [
    { label: '2024-06-01', amount: 150.5 },
    { label: '2024-06-02', amount: 0 },
]

describe('getChargesFlowByDate', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/wallets/{id}/charges/graph/amount without params', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: rawDataPoints } })

        const result = await getChargesFlowByDate(2)

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets/2/charges/graph/amount', { params: undefined })
        expect(result).toHaveLength(2)
        expect(result[0].label).toBe('2024-06-01')
        expect(result[0].amount).toBe(150.5)
        expect(result[1].amount).toBe(0)
    })

    it('passes groupBy and type params when provided', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [] } })

        await getChargesFlowByDate(2, { groupBy: 'month', type: '-' })

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets/2/charges/graph/amount', {
            params: { groupBy: 'month', type: '-' },
        })
    })
})
