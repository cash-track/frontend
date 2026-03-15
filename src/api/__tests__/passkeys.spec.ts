import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosInstance } from 'axios'

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))

vi.mock('../client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../client')>()
    return { ...actual, apiCall: vi.fn((fn: (c: AxiosInstance) => Promise<unknown>) => fn(mockAxios)) }
})

const mockAxios = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance

import { getPasskeys, initPasskey, storePasskey, deletePasskey } from '../profile/passkeys'
import { Passkey } from '../models/passkey'

const rawPasskey = { id: 7, name: 'YubiKey', createdAt: '2024-01-01T00:00:00Z', usedAt: null }

describe('getPasskeys', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls GET /api/profile/passkey and returns Passkey[]', async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: { data: [rawPasskey] } })

        const result = await getPasskeys()

        expect(mockAxios.get).toHaveBeenCalledWith('/api/profile/passkey')
        expect(result).toHaveLength(1)
        expect(result[0]).toBeInstanceOf(Passkey)
        expect(result[0].id).toBe(7)
        expect(result[0].name).toBe('YubiKey')
        expect(result[0].usedAt).toBeNull()
    })
})

describe('initPasskey', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts name to /api/profile/passkey/init and returns challenge data', async () => {
        const initResponse = { challenge: 'chall-abc', data: 'base64data' }
        mockAxios.post = vi.fn().mockResolvedValue({ data: initResponse })

        const result = await initPasskey('YubiKey')

        expect(mockAxios.post).toHaveBeenCalledWith('/api/profile/passkey/init', { name: 'YubiKey' })
        expect(result.challenge).toBe('chall-abc')
        expect(result.data).toBe('base64data')
    })
})

describe('storePasskey', () => {
    beforeEach(() => vi.clearAllMocks())

    it('posts base64-encoded data to /api/profile/passkey and returns Passkey', async () => {
        mockAxios.post = vi.fn().mockResolvedValue({ data: { data: rawPasskey } })

        const credentialData = { id: 'cred-id', rawId: 'raw', type: 'public-key' }
        const result = await storePasskey({ challenge: 'chall-abc', data: credentialData })

        const call = (mockAxios.post as ReturnType<typeof vi.fn>).mock.calls[0]
        expect(call[0]).toBe('/api/profile/passkey')
        expect(call[1].challenge).toBe('chall-abc')
        // data should be base64-encoded JSON
        expect(call[1].data).toBe(btoa(JSON.stringify(credentialData)))
        expect(result).toBeInstanceOf(Passkey)
        expect(result.name).toBe('YubiKey')
    })
})

describe('deletePasskey', () => {
    beforeEach(() => vi.clearAllMocks())

    it('calls DELETE /api/profile/passkey/{id}', async () => {
        mockAxios.delete = vi.fn().mockResolvedValue({ data: {} })

        await deletePasskey(7)

        expect(mockAxios.delete).toHaveBeenCalledWith('/api/profile/passkey/7')
    })
})
