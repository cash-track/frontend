import { apiCall } from './client'
import { Charge, ChargeTitleSuggestion } from './models/charge'
import { Pagination } from './models/pagination'
import type { PaginatedResponse } from './models/pagination'

export interface ChargeRequest {
    type: '+' | '-'
    amount: number
    title: string
    description?: string | null
    tags?: number[] | null
    dateTime?: string | null
}

export interface GetChargesParams {
    page?: number
    limit?: number
    'date-from'?: string
    'date-to'?: string
    tags?: string
}

export async function getCharges(walletId: number, params?: GetChargesParams): Promise<PaginatedResponse<Charge>> {
    return apiCall(async client => {
        const res = await client.get(`/api/wallets/${walletId}/charges`, { params })
        return {
            data: (res.data.data as unknown[]).map(Charge.from),
            pagination: Pagination.from(res.data.pagination),
        }
    })
}

export async function createCharge(walletId: number, request: ChargeRequest): Promise<Charge> {
    return apiCall(async client => {
        const res = await client.post(`/api/wallets/${walletId}/charges`, request)
        return Charge.from(res.data.data)
    })
}

export async function updateCharge(walletId: number, chargeId: string, request: ChargeRequest): Promise<Charge> {
    return apiCall(async client => {
        const res = await client.put(`/api/wallets/${walletId}/charges/${chargeId}`, request)
        return Charge.from(res.data.data)
    })
}

export async function deleteCharge(walletId: number, chargeId: string): Promise<void> {
    return apiCall(async client => {
        await client.delete(`/api/wallets/${walletId}/charges/${chargeId}`)
    })
}

export async function moveCharges(walletId: number, targetWalletId: number, chargeIds: string[]): Promise<void> {
    return apiCall(async client => {
        await client.post(`/api/wallets/${walletId}/charges/move/${targetWalletId}`, { chargeIds })
    })
}

export async function getChargeTitles(query: string): Promise<ChargeTitleSuggestion[]> {
    return apiCall(async client => {
        const res = await client.get(`/api/charges/title/suggestions/${encodeURIComponent(query)}`)
        return (res.data.data as unknown[]).map(ChargeTitleSuggestion.from)
    })
}
