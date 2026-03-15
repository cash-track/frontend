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

import { getCharges, createCharge } from '../charges'
import { Charge } from '../models/charge'
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
    page: 1,
    limit: 25,
    total: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
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

    it('passes page param when provided', async () => {
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
