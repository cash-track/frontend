import { apiCall } from '../client'
import { Passkey } from '../models/passkey'

export interface InitPasskeyResponse {
    challenge: string
    data: string
}

export interface StorePasskeyRequest {
    challenge: string
    data: object
}

export async function getPasskeys(): Promise<Passkey[]> {
    return apiCall(async client => {
        const res = await client.get('/api/profile/passkey')
        return (res.data.data as unknown[]).map(Passkey.from)
    })
}

export async function initPasskey(name: string): Promise<InitPasskeyResponse> {
    return apiCall(async client => {
        const res = await client.post('/api/profile/passkey/init', { name })
        return res.data as InitPasskeyResponse
    })
}

export async function storePasskey(request: StorePasskeyRequest): Promise<Passkey> {
    return apiCall(async client => {
        const res = await client.post('/api/profile/passkey', {
            challenge: request.challenge,
            data: btoa(JSON.stringify(request.data)),
        })
        return Passkey.from(res.data.data)
    })
}

export async function deletePasskey(passkeyId: number): Promise<void> {
    return apiCall(async client => {
        await client.delete(`/api/profile/passkey/${passkeyId}`)
    })
}
