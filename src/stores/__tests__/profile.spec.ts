import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))
vi.mock('@/api/auth', () => ({ logout: vi.fn().mockResolvedValue({}) }))
vi.stubGlobal('window', { location: { set href(_v: string) {} } })

const { mockGetProfile } = vi.hoisted(() => ({ mockGetProfile: vi.fn() }))
vi.mock('@/api/profile', () => ({ getProfile: mockGetProfile }))

import { useProfileStore } from '../profile'
import { useAuthStore } from '../auth'
import type { User } from '@/api/models/user'

const mockUser = {
    id: 1,
    name: 'Alice',
    lastName: null,
    nickName: 'alice',
    email: 'alice@test.com',
    isEmailConfirmed: true,
    photoUrl: null,
    defaultCurrencyCode: null,
    defaultCurrency: null,
    locale: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    displayName: 'Alice',
} as unknown as User

describe('useProfileStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        // reset cookie state
        Object.defineProperty(document, 'cookie', {
            writable: true,
            value: '',
        })
    })

    it('initial state: profile null, loading false', () => {
        const store = useProfileStore()
        expect(store.profile).toBeNull()
        expect(store.loading).toBe(false)
    })

    it('loadProfile() calls getProfile and commits to authStore', async () => {
        mockGetProfile.mockResolvedValue(mockUser)
        const store = useProfileStore()
        const authStore = useAuthStore()

        await store.loadProfile()

        expect(store.profile).toBe(mockUser)
        expect(authStore.isLogged).toBe(true)
        expect(store.loading).toBe(false)
    })

    it('loadProfile() calls authStore.logout() on API error', async () => {
        mockGetProfile.mockRejectedValue(new Error('Unauthorized'))
        const store = useProfileStore()
        const authStore = useAuthStore()

        // pre-login to verify logout is called
        authStore.login(mockUser)
        expect(authStore.isLogged).toBe(true)

        await store.loadProfile()

        expect(store.profile).toBeNull()
        expect(authStore.isLogged).toBe(false)
        expect(store.loading).toBe(false)
    })

    it('updatePhotoUrl() replaces photoUrl on profile', async () => {
        mockGetProfile.mockResolvedValue(mockUser)
        const store = useProfileStore()
        await store.loadProfile()

        store.updatePhotoUrl('https://cdn.test/photo.jpg')

        expect(store.profile?.photoUrl).toBe('https://cdn.test/photo.jpg')
    })

    it('updatePhotoUrl() is a no-op when profile is null', () => {
        const store = useProfileStore()
        expect(() => store.updatePhotoUrl('https://cdn.test/photo.jpg')).not.toThrow()
        expect(store.profile).toBeNull()
    })
})
