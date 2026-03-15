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
    getCharges, createCharge, updateCharge, deleteCharge, moveCharges, getChargeTitles,
} from '../charges'
import { Charge, ChargeTitleSuggestion } from '../models/charge'
import { Pagination } from '../models/pagination'

const rawCharge = {
    id: 'uuid-1234',
    operation: '-',
    amount: 42.5,
    title: 'Lunch',
    description: null,
    userId: 1,
    walletId: 2,
    dateTime: '2024-06-01T13:00:00Z',
    createdAt: '2024-06-01T13:00:00Z',
    updatedAt: '2024-06-01T13:00:00Z',
    user: null,
    tags: [],
    wallet: null,
}

const rawPagination = {
    page: 1, limit: 25, total: 1, totalPages: 1, hasNext: false, hasPrev: false,
}

describe('getCharges', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/wallets/{walletId}/charges and returns paginated Charge[]', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({
            data: { data: [rawCharge], pagination: rawPagination },
        })

        const result = await getCharges(2)

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets/2/charges', { params: undefined })
        expect(result.data).toHaveLength(1)
        expect(result.data[0]).toBeInstanceOf(Charge)
        expect(result.data[0].id).toBe('uuid-1234')
        expect(result.data[0].amount).toBe(42.5)
        expect(result.pagination).toBeInstanceOf(Pagination)
        expect(result.pagination.total).toBe(1)
    })

    it('passes pagination params when provided', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({
            data: { data: [], pagination: rawPagination },
        })

        await getCharges(2, { page: 3, limit: 10 })

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets/2/charges', {
            params: { page: 3, limit: 10 },
        })
    })
})

describe('createCharge', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts to correct endpoint with body and returns Charge', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: { data: rawCharge } })

        const request = {
            type: '-' as const,
            amount: 42.5,
            title: 'Lunch',
            description: null,
            tags: [1, 3],
            dateTime: '2024-06-01T13:00:00Z',
        }

        const result = await createCharge(2, request)

        expect(mockAxios.post).toHaveBeenCalledWith('/api/wallets/2/charges', request)
        expect(result).toBeInstanceOf(Charge)
        expect(result.title).toBe('Lunch')
        expect(result.operation).toBe('-')
    })
})

describe('updateCharge', () => {
    beforeEach(() => vi.clearAllMocks())

    it('puts to /api/wallets/{id}/charges/{chargeId} and returns updated Charge', async () => {
        const updated = { ...rawCharge, title: 'Dinner', amount: 60.0 }
        mockAxios.put = vi.fn().mockResolvedValue({ data: { data: updated } })

        const request = { type: '-' as const, amount: 60.0, title: 'Dinner', description: null }
        const result = await updateCharge(2, 'uuid-1234', request)

        expect(mockAxios.put).toHaveBeenCalledWith('/api/wallets/2/charges/uuid-1234', request)
        expect(result).toBeInstanceOf(Charge)
        expect(result.title).toBe('Dinner')
        expect(result.amount).toBe(60.0)
    })
})

describe('deleteCharge', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls DELETE /api/wallets/{id}/charges/{chargeId}', async () => {
        mockAxios.delete = vi.fn().mockResolvedValue({ data: {} })

        await deleteCharge(2, 'uuid-1234')

        expect(mockAxios.delete).toHaveBeenCalledWith('/api/wallets/2/charges/uuid-1234')
    })
})

describe('moveCharges', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts charge IDs to /api/wallets/{id}/charges/move/{targetId}', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: {} })

        await moveCharges(2, 7, ['uuid-1', 'uuid-2'])

        expect(mockAxios.post).toHaveBeenCalledWith('/api/wallets/2/charges/move/7', {
            chargeIds: ['uuid-1', 'uuid-2'],
        })
    })
})

describe('getChargeTitles', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/charges/title/suggestions/{query} and returns ChargeTitleSuggestion[]', async () => {
        const rawSuggestions = [{ title: 'Lunch', count: 5 }, { title: 'Lunchbox', count: 1 }]
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: rawSuggestions } })

        const result = await getChargeTitles('Lun')

        expect(mockAxios.get).toHaveBeenCalledWith('/api/charges/title/suggestions/Lun')
        expect(result).toHaveLength(2)
        expect(result[0]).toBeInstanceOf(ChargeTitleSuggestion)
        expect(result[0].title).toBe('Lunch')
        expect(result[0].count).toBe(5)
    })

    it('URL-encodes special characters in query', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [] } })

        await getChargeTitles('cafe & bar')

        expect(mockAxios.get).toHaveBeenCalledWith(
            '/api/charges/title/suggestions/cafe%20%26%20bar',
        )
    })
})
