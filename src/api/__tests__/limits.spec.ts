import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosInstance } from 'axios'

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))

vi.mock('../client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../client')>()
    return { ...actual, apiCall: vi.fn((fn: (c: AxiosInstance) => Promise<unknown>) => fn(mockAxios)) }
})

const mockAxios = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance

import { getLimits, createLimit, updateLimit, deleteLimit, copyLimits } from '../limits'
import { Limit, WalletLimit } from '../models/limit'

const rawLimit = {
    id: 10, operation: '-', amount: 500, walletId: 2,
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    tags: [], wallet: null,
}

const rawWalletLimit = { amount: 200, percentage: 0.4, limit: rawLimit }

describe('getLimits', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/wallets/{id}/limits and returns WalletLimit[]', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [rawWalletLimit] } })

        const result = await getLimits(2)

        expect(mockAxios.get).toHaveBeenCalledWith('/api/wallets/2/limits')
        expect(result).toHaveLength(1)
        expect(result[0]).toBeInstanceOf(WalletLimit)
        expect(result[0].amount).toBe(200)
        expect(result[0].percentage).toBe(0.4)
        expect(result[0].limit).toBeInstanceOf(Limit)
        expect(result[0].isExceeded).toBe(false)
    })
})

describe('createLimit', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts limit data to /api/wallets/{id}/limits and returns Limit', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: { data: rawLimit } })

        const result = await createLimit(2, { type: '-', amount: 500, tags: [1, 2] })

        expect(mockAxios.post).toHaveBeenCalledWith('/api/wallets/2/limits', {
            type: '-', amount: 500, tags: [1, 2],
        })
        expect(result).toBeInstanceOf(Limit)
        expect(result.amount).toBe(500)
        expect(result.operation).toBe('-')
    })
})

describe('updateLimit', () => {
    beforeEach(() => vi.clearAllMocks())

    it('puts limit data to /api/wallets/{id}/limits/{limitId} and returns Limit', async () => {
        const updated = { ...rawLimit, amount: 750 }
        mockAxios.put = vi.fn().mockResolvedValue({ data: { data: updated } })

        const result = await updateLimit(2, 10, { type: '-', amount: 750, tags: [] })

        expect(mockAxios.put).toHaveBeenCalledWith('/api/wallets/2/limits/10', {
            type: '-', amount: 750, tags: [],
        })
        expect(result).toBeInstanceOf(Limit)
        expect(result.amount).toBe(750)
    })
})

describe('deleteLimit', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls DELETE /api/wallets/{id}/limits/{limitId}', async () => {
        mockAxios.delete = vi.fn().mockResolvedValue({ data: {} })

        await deleteLimit(2, 10)

        expect(mockAxios.delete).toHaveBeenCalledWith('/api/wallets/2/limits/10')
    })
})

describe('copyLimits', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts to /api/wallets/{id}/limits/copy/{sourceId} and returns WalletLimit[]', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: { data: [rawWalletLimit] } })

        const result = await copyLimits(2, 5)

        expect(mockAxios.post).toHaveBeenCalledWith('/api/wallets/2/limits/copy/5')
        expect(result[0]).toBeInstanceOf(WalletLimit)
    })
})
