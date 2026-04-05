import { apiCall } from './client'
import { Tag } from './models/tag'
import { Charge, ChargeTotal } from './models/charge'
import { Pagination } from './models/pagination'
import type { PaginatedResponse } from './models/pagination'

export interface TagRequest {
    name: string
    icon?: string | null
    color?: string | null
}

export async function getTags(): Promise<Tag[]> {
    return apiCall(async client => {
        const res = await client.get('/api/tags')
        return (res.data.data as unknown[]).map(Tag.from)
    })
}

export async function getCommonTags(): Promise<Tag[]> {
    return apiCall(async client => {
        const res = await client.get('/api/tags/common')
        return (res.data.data as unknown[]).map(Tag.from)
    })
}

export async function createTag(request: TagRequest): Promise<Tag> {
    return apiCall(async client => {
        const res = await client.post('/api/tags', request)
        return Tag.from(res.data.data)
    })
}

export async function updateTag(tagId: number, request: TagRequest): Promise<Tag> {
    return apiCall(async client => {
        const res = await client.put(`/api/tags/${tagId}`, request)
        return Tag.from(res.data.data)
    })
}

export async function deleteTag(tagId: number): Promise<void> {
    return apiCall(async client => {
        await client.delete(`/api/tags/${tagId}`)
    })
}

export async function getTagCharges(tagId: number, page = 1, limit?: number): Promise<PaginatedResponse<Charge>> {
    return apiCall(async client => {
        const params: Record<string, unknown> = { page }
        if (limit !== undefined) params.limit = limit
        const res = await client.get(`/api/tags/${tagId}/charges`, { params })
        return {
            data: (res.data.data as unknown[]).map(Charge.from),
            pagination: Pagination.from(res.data.pagination),
        }
    })
}

export async function getTagTotals(tagId: number): Promise<ChargeTotal> {
    return apiCall(async client => {
        const res = await client.get(`/api/tags/${tagId}/charges/total`)
        return ChargeTotal.from(res.data.data)
    })
}

export async function getWalletTags(walletId: number): Promise<Tag[]> {
    return apiCall(async client => {
        const res = await client.get(`/api/wallets/${walletId}/tags`)
        return (res.data.data as unknown[]).map(Tag.from)
    })
}

export async function searchWalletTags(walletId: number, query: string): Promise<Tag[]> {
    return apiCall(async client => {
        const res = await client.get(`/api/wallets/${walletId}/tags/find/${encodeURIComponent(query)}`)
        return (res.data.data as unknown[]).map(Tag.from)
    })
}
