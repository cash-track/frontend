import { apiCall } from './client'
import { User } from './models/user'
import { Currency } from './models/currency'
import { Wallet } from './models/wallet'

export interface ChargesFlowStats {
    income: number
    expense: number
    currency: Currency | null
}

export interface CounterStats {
    wallets: number
    walletsArchived: number
    charges: number
    chargesIncome: number
}

export interface UpdateProfileRequest {
    name: string
    lastName?: string | null
    nickName: string
    defaultCurrencyCode: string
    locale: string
}

export interface UploadPhotoResponse {
    message: string
    fileName: string
    url: string
}

export async function getProfile(): Promise<User> {
    return apiCall(async client => {
        const res = await client.get('/api/profile')
        return User.from(res.data.data)
    })
}

export async function updateProfile(request: UpdateProfileRequest): Promise<User> {
    return apiCall(async client => {
        const res = await client.put('/api/profile', request)
        return User.from(res.data.data)
    })
}

export async function checkNickName(nickName: string): Promise<void> {
    return apiCall(async client => {
        await client.post('/api/profile/check/nick-name', { nickName })
    })
}

export async function uploadPhoto(photo: File): Promise<UploadPhotoResponse> {
    return apiCall(async client => {
        const form = new FormData()
        form.set('photo', photo)
        const res = await client.put('/api/profile/photo', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return res.data as UploadPhotoResponse
    })
}

export async function updateLocale(locale: string): Promise<User> {
    return apiCall(async client => {
        const res = await client.put('/api/profile/locale', { locale })
        return User.from(res.data.data)
    })
}

export async function getChargesFlowStats(): Promise<ChargesFlowStats> {
    return apiCall(async client => {
        const res = await client.get('/api/profile/statistics/charges-flow')
        const d = res.data.data as Record<string, unknown>
        return {
            income: typeof d.income === 'number' ? d.income : 0,
            expense: typeof d.expense === 'number' ? d.expense : 0,
            currency: d.currency ? Currency.from(d.currency) : null,
        }
    })
}

export async function getCounterStats(): Promise<CounterStats> {
    return apiCall(async client => {
        const res = await client.get('/api/profile/statistics/counters')
        const d = res.data.data as Record<string, unknown>
        return {
            wallets: typeof d.wallets === 'number' ? d.wallets : 0,
            walletsArchived: typeof d.walletsArchived === 'number' ? d.walletsArchived : 0,
            charges: typeof d.charges === 'number' ? d.charges : 0,
            chargesIncome: typeof d.chargesIncome === 'number' ? d.chargesIncome : 0,
        }
    })
}

export async function getLatestWallets(): Promise<Wallet[]> {
    return apiCall(async client => {
        const res = await client.get('/api/profile/wallets/latest')
        return (res.data.data as unknown[]).map(Wallet.from)
    })
}
