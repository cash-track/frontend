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

    it('initial state: profile null, loading false, failed false, lastError null', () => {
        const store = useProfileStore()
        expect(store.profile).toBeNull()
        expect(store.loading).toBe(false)
        expect(store.failed).toBe(false)
        expect(store.lastError).toBeNull()
    })

    it('loadProfile() calls getProfile and commits to authStore on success', async () => {
        mockGetProfile.mockResolvedValue(mockUser)
        const store = useProfileStore()
        const authStore = useAuthStore()

        await store.loadProfile()

        expect(store.profile).toBe(mockUser)
        expect(authStore.isLogged).toBe(true)
        expect(store.loading).toBe(false)
        expect(store.failed).toBe(false)
        expect(store.lastError).toBeNull()
    })

    it('loadProfile() sets failed and lastError on transient error, does NOT call logout, isLogged stays false', async () => {
        const err = new Error('Network timeout')
        mockGetProfile.mockRejectedValue(err)
        const store = useProfileStore()
        const authStore = useAuthStore()

        // spy on logout to confirm it is NOT called
        const logoutSpy = vi.spyOn(authStore, 'logout')

        await store.loadProfile()

        expect(store.failed).toBe(true)
        expect(store.lastError).toBe(err)
        expect(store.loading).toBe(false)
        expect(authStore.isLogged).toBe(false)
        expect(logoutSpy).not.toHaveBeenCalled()
    })

    it('loadProfile() resets failed and lastError on retry success', async () => {
        const err = new Error('Transient')
        mockGetProfile.mockRejectedValueOnce(err).mockResolvedValue(mockUser)
        const store = useProfileStore()

        await store.loadProfile()
        expect(store.failed).toBe(true)

        await store.loadProfile()
        expect(store.failed).toBe(false)
        expect(store.lastError).toBeNull()
        expect(store.profile).toBe(mockUser)
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
