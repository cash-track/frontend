import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosInstance } from 'axios'

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))

vi.mock('../client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../client')>()
    return { ...actual, apiCall: vi.fn((fn: (c: AxiosInstance) => Promise<unknown>) => fn(mockAxios)) }
})

const mockAxios = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance

import {
    getTags, createTag, updateTag, deleteTag,
    getTagCharges, getTagTotals, getWalletTags, searchWalletTags, getTagSuggestions,
} from '../tags'
import { Tag } from '../models/tag'
import { Charge, ChargeTotal } from '../models/charge'
import { Pagination } from '../models/pagination'

const rawTag = { id: 3, name: 'Food', icon: '🍔', color: '#ff0000', userId: 1, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }

const rawCharge = {
    id: 'uuid-1', operation: '-', amount: 15.0, title: 'Lunch', description: null,
    userId: 1, walletId: 2, dateTime: '2024-06-01T12:00:00Z',
    createdAt: '2024-06-01T12:00:00Z', updatedAt: '2024-06-01T12:00:00Z',
    user: null, tags: [], wallet: null,
}

const rawPagination = { page: 1, limit: 25, total: 1, totalPages: 1, hasNext: false, hasPrev: false }

describe('getTags', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/tags and returns Tag[]', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [rawTag] } })

        const result = await getTags()

        expect(mockAxios.get).toHaveBeenCalledWith('/api/tags')
        expect(result[0]).toBeInstanceOf(Tag)
        expect(result[0].name).toBe('Food')
        expect(result[0].color).toBe('#ff0000')
    })
})

describe('createTag', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts tag data to /api/tags and returns Tag', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: { data: rawTag } })

        const result = await createTag({ name: 'Food', icon: '🍔', color: '#ff0000' })

        expect(mockAxios.post).toHaveBeenCalledWith('/api/tags', { name: 'Food', icon: '🍔', color: '#ff0000' })
        expect(result).toBeInstanceOf(Tag)
        expect(result.id).toBe(3)
    })
})

describe('updateTag', () => {
    beforeEach(() => vi.clearAllMocks())

    it('puts tag data to /api/tags/{id} and returns updated Tag', async () => {
        const updated = { ...rawTag, name: 'Groceries' }
        mockAxios.put = vi.fn().mockResolvedValue({ data: { data: updated } })

        const result = await updateTag(3, { name: 'Groceries', icon: '🛒', color: '#00ff00' })

        expect(mockAxios.put).toHaveBeenCalledWith('/api/tags/3', { name: 'Groceries', icon: '🛒', color: '#00ff00' })
        expect(result.name).toBe('Groceries')
    })
})

describe('deleteTag', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls DELETE /api/tags/{id}', async () => {
        mockAxios.delete = vi.fn().mockResolvedValue({ data: {} })

        await deleteTag(3)

        expect(mockAxios.delete).toHaveBeenCalledWith('/api/tags/3')
    })
})

describe('getTagCharges', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/tags/{id}/charges with page param and returns paginated Charge[]', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [rawCharge], pagination: rawPagination } })

        const result = await getTagCharges(3, { page: 2 })

        expect(mockAxios.get).toHaveBeenCalledWith('/api/tags/3/charges', { params: { page: 2 } })
        expect(result.data[0]).toBeInstanceOf(Charge)
        expect(result.pagination).toBeInstanceOf(Pagination)
        expect(result.pagination.page).toBe(1)
    })

    it('defaults to page 1', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [], pagination: rawPagination } })

        await getTagCharges(3)

        expect(mockAxios.get).toHaveBeenCalledWith('/api/tags/3/charges', { params: { page: 1 } })
    })

    it('includes limit param when provided', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [], pagination: rawPagination } })

        await getTagCharges(3, { page: 1, limit: 10 })

        expect(mockAxios.get).toHaveBeenCalledWith('/api/tags/3/charges', { params: { page: 1, limit: 10 } })
    })
})

describe('getTagTotals', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/tags/{id}/charges/total and returns ChargeTotal', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({
            data: { data: { totalAmount: 100, totalIncomeAmount: 150, totalExpenseAmount: 50, currency: null } },
        })

        const result = await getTagTotals(3)

        expect(mockAxios.get).toHaveBeenCalledWith('/api/tags/3/charges/total', { params: {} })
        expect(result).toBeInstanceOf(ChargeTotal)
        expect(result.totalAmount).toBe(100)
        expect(result.totalIncomeAmount).toBe(150)
    })
})

describe('getWalletTags', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/wallets/{id}/tags and returns Tag[]', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [rawTag] } })

        const result = await getWalletTags(2)

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets/2/tags')
        expect(result[0]).toBeInstanceOf(Tag)
        expect(result[0].id).toBe(3)
    })
})

describe('searchWalletTags', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/wallets/{id}/tags/find/{query} with encoded query', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [rawTag] } })

        const result = await searchWalletTags(2, 'foo bar')

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets/2/tags/find/foo%20bar')
        expect(result[0]).toBeInstanceOf(Tag)
    })
})

describe('getTagSuggestions', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/tags/suggestions/{query} with encoded query', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [rawTag] } })

        const result = await getTagSuggestions('foo bar')

        expect(mockAxios.get).toHaveBeenCalledWith('/api/tags/suggestions/foo%20bar')
        expect(result[0]).toBeInstanceOf(Tag)
    })
})
