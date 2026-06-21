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

export async function getTagById(tagId: number): Promise<Tag> {
    return apiCall(async client => {
        const res = await client.get(`/api/tags/common/${tagId}`)
        return Tag.from(res.data.data)
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

export interface TagChargesParams {
    page?: number
    limit?: number
    'date-from'?: string
    'date-to'?: string
}

export async function getTagCharges(tagId: number, params: TagChargesParams = {}): Promise<PaginatedResponse<Charge>> {
    return apiCall(async client => {
        const query: Record<string, unknown> = { page: params.page ?? 1 }
        if (params.limit !== undefined) query.limit = params.limit
        if (params['date-from']) query['date-from'] = params['date-from']
        if (params['date-to']) query['date-to'] = params['date-to']
        const res = await client.get(`/api/tags/${tagId}/charges`, { params: query })
        return {
            data: (res.data.data as unknown[]).map(Charge.from),
            pagination: Pagination.from(res.data.pagination),
        }
    })
}

export interface TagTotalsParams {
    'date-from'?: string
    'date-to'?: string
}

export async function getTagTotals(tagId: number, params: TagTotalsParams = {}): Promise<ChargeTotal> {
    return apiCall(async client => {
        const query: Record<string, unknown> = {}
        if (params['date-from']) query['date-from'] = params['date-from']
        if (params['date-to']) query['date-to'] = params['date-to']
        const res = await client.get(`/api/tags/${tagId}/charges/total`, { params: query })
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
