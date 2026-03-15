import { apiCall } from './client'
import { UserShort } from './models/user'

export async function findUserByEmail(email: string): Promise<UserShort> {
    return apiCall(async client => {
        const res = await client.get(`/api/users/find/by-email/${encodeURIComponent(email)}`)
        return UserShort.from(res.data.data)
    })
}

export async function findUsersByCommonWallets(): Promise<UserShort[]> {
    return apiCall(async client => {
        const res = await client.get('/api/users/find/by-common-wallets')
        return (res.data.data as unknown[]).map(UserShort.from)
    })
}
