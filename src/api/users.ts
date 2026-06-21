import { apiCall } from './client'
import { User } from './models/user'

export async function findUserByEmail(email: string): Promise<User> {
    return apiCall(async client => {
        const res = await client.get(`/api/users/find/by-email/${encodeURIComponent(email)}`)
        return User.from(res.data.data)
    })
}

export async function findUsersByCommonWallets(): Promise<User[]> {
    return apiCall(async client => {
        const res = await client.get('/api/users/find/by-common-wallets')
        return (res.data.data as unknown[]).map(User.from)
    })
}
