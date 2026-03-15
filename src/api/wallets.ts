import { apiCall } from './client'
import { Wallet, WalletTotal } from './models/wallet'
import { UserShort } from './models/user'

export interface CreateWalletRequest {
    name: string
    slug: string
    isPublic: boolean
    defaultCurrencyCode: string
}

export interface UpdateWalletRequest {
    name: string
    isPublic: boolean
    defaultCurrencyCode: string
}

export async function getWallets(): Promise<Wallet[]> {
    return apiCall(async client => {
        const res = await client.get('/api/wallets')
        return (res.data.data as unknown[]).map(Wallet.from)
    })
}

export async function getUnarchived(): Promise<Wallet[]> {
    return apiCall(async client => {
        const res = await client.get('/api/wallets/unarchived')
        return (res.data.data as unknown[]).map(Wallet.from)
    })
}

export async function getArchived(): Promise<Wallet[]> {
    return apiCall(async client => {
        const res = await client.get('/api/wallets/archived')
        return (res.data.data as unknown[]).map(Wallet.from)
    })
}

export async function getWallet(walletId: number): Promise<Wallet> {
    return apiCall(async client => {
        const res = await client.get(`/api/wallets/${walletId}`)
        return Wallet.from(res.data.data)
    })
}

export async function createWallet(request: CreateWalletRequest): Promise<Wallet> {
    return apiCall(async client => {
        const res = await client.post('/api/wallets', request)
        return Wallet.from(res.data.data)
    })
}

export async function updateWallet(walletId: number, request: UpdateWalletRequest): Promise<Wallet> {
    return apiCall(async client => {
        const res = await client.put(`/api/wallets/${walletId}`, request)
        return Wallet.from(res.data.data)
    })
}

export async function deleteWallet(walletId: number): Promise<void> {
    return apiCall(async client => {
        await client.delete(`/api/wallets/${walletId}`)
    })
}

export async function activateWallet(walletId: number): Promise<void> {
    return apiCall(async client => {
        await client.post(`/api/wallets/${walletId}/activate`)
    })
}

export async function archiveWallet(walletId: number): Promise<void> {
    return apiCall(async client => {
        await client.post(`/api/wallets/${walletId}/archive`)
    })
}

export async function unarchiveWallet(walletId: number): Promise<void> {
    return apiCall(async client => {
        await client.post(`/api/wallets/${walletId}/un-archive`)
    })
}

export async function getWalletTotals(walletId: number): Promise<WalletTotal> {
    return apiCall(async client => {
        const res = await client.get(`/api/wallets/${walletId}/total`)
        return WalletTotal.from(res.data.data)
    })
}

export async function sortWallets(sort: number[]): Promise<void> {
    return apiCall(async client => {
        await client.post('/api/wallets/unarchived/sort', { sort })
    })
}

export async function getWalletUsers(walletId: number): Promise<UserShort[]> {
    return apiCall(async client => {
        const res = await client.get(`/api/wallets/${walletId}/users`)
        return (res.data.data as unknown[]).map(UserShort.from)
    })
}

export async function shareWallet(walletId: number, userId: number): Promise<void> {
    return apiCall(async client => {
        await client.patch(`/api/wallets/${walletId}/users/${userId}`)
    })
}

export async function unshareWallet(walletId: number, userId: number): Promise<void> {
    return apiCall(async client => {
        await client.delete(`/api/wallets/${walletId}/users/${userId}`)
    })
}
