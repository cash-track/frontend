import { apiCall } from './client'
import { Limit, WalletLimit } from './models/limit'

export interface LimitRequest {
    type: '+' | '-'
    amount: number
    tags: number[]
}

export async function getLimits(walletId: number): Promise<WalletLimit[]> {
    return apiCall(async client => {
        const res = await client.get(`/api/wallets/${walletId}/limits`)
        return (res.data.data as unknown[]).map(WalletLimit.from)
    })
}

export async function createLimit(walletId: number, request: LimitRequest): Promise<Limit> {
    return apiCall(async client => {
        const res = await client.post(`/api/wallets/${walletId}/limits`, {
            type: request.type,
            amount: request.amount,
            tags: request.tags,
        })
        return Limit.from(res.data.data)
    })
}

export async function updateLimit(walletId: number, limitId: number, request: LimitRequest): Promise<Limit> {
    return apiCall(async client => {
        const res = await client.put(`/api/wallets/${walletId}/limits/${limitId}`, {
            type: request.type,
            amount: request.amount,
            tags: request.tags,
        })
        return Limit.from(res.data.data)
    })
}

export async function deleteLimit(walletId: number, limitId: number): Promise<void> {
    return apiCall(async client => {
        await client.delete(`/api/wallets/${walletId}/limits/${limitId}`)
    })
}

export async function copyLimits(walletId: number, sourceWalletId: number): Promise<WalletLimit[]> {
    return apiCall(async client => {
        const res = await client.post(`/api/wallets/${walletId}/limits/copy/${sourceWalletId}`)
        return (res.data.data as unknown[]).map(WalletLimit.from)
    })
}
