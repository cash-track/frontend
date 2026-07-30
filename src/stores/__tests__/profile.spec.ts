import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))
vi.mock('@/api/auth', () => ({ logout: vi.fn().mockResolvedValue({}) }))
vi.stubGlobal('window', { location: { set href(_v: string) {} } })

const { mockGetProfile } = vi.hoisted(() => ({ mockGetProfile: vi.fn() }))
vi.mock('@/api/profile', () => ({ getProfile: mockGetProfile }))

import { useProfileStore } from '../profile'
import { useAuthStore } from '../auth'
import { PROFILE_COOKIE, writeCachedProfile } from '@/shared/profileCookie'
import type { User } from '@/api/models/user'

const mockCachedProfile = {
    v: 1 as const,
    id: 1,
    name: 'Ann',
    lastName: null,
    nickName: 'ann',
    email: 'a@b.c',
    photoUrl: null,
    isEmailConfirmed: true,
    locale: 'en',
}

let cookieJar: Record<string, string>

// See shared/__tests__/sharedCookie.spec.ts for why jsdom's native cookie jar is replaced.
// A real jar is needed here: setProfile() writes cshtrkp and cshtrkl in the same call.
function installCookieJar() {
    cookieJar = {}
    Object.defineProperty(document, 'cookie', {
        configurable: true,
        get() {
            return Object.entries(cookieJar)
                .map(([name, value]) => `${name}=${value}`)
                .join('; ')
        },
        set(raw: string) {
            const firstPair = raw.split(';')[0]
            const eqIndex = firstPair.indexOf('=')
            const name = firstPair.slice(0, eqIndex).trim()
            const value = firstPair.slice(eqIndex + 1)
            if (/max-age=0(?:;|$)/.test(raw)) {
                delete cookieJar[name]
            } else {
                cookieJar[name] = value
            }
        },
    })
}

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
        installCookieJar()
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

    it('loadProfile() success writes the cshtrkp cookie', async () => {
        mockGetProfile.mockResolvedValue(mockUser)
        const store = useProfileStore()

        await store.loadProfile()

        expect(document.cookie).toContain(PROFILE_COOKIE)
    })

    it('loadCachedProfile() seeds cachedProfile and logs in authStore from the cshtrkp cookie', () => {
        writeCachedProfile(mockCachedProfile)
        const store = useProfileStore()
        const authStore = useAuthStore()

        store.loadCachedProfile()

        expect(store.cachedProfile).toEqual(mockCachedProfile)
        expect(authStore.isLogged).toBe(true)
        expect(authStore.isEmailConfirmed).toBe(true)
    })

    it('loadCachedProfile() is a no-op when there is no cached cookie', () => {
        const store = useProfileStore()
        const authStore = useAuthStore()

        store.loadCachedProfile()

        expect(store.cachedProfile).toBeNull()
        expect(authStore.isLogged).toBe(false)
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

    it('loadProfile() failure resets optimistic state but leaves the cshtrkp cookie intact', async () => {
        writeCachedProfile(mockCachedProfile)
        const store = useProfileStore()
        const authStore = useAuthStore()
        store.loadCachedProfile()
        expect(authStore.isLogged).toBe(true)

        mockGetProfile.mockRejectedValue(new Error('Network timeout'))
        await store.loadProfile()

        expect(store.profile).toBeNull()
        expect(store.cachedProfile).toBeNull()
        expect(authStore.isLogged).toBe(false)
        // A transient failure must not invalidate a still-valid cookie.
        expect(document.cookie).toContain(PROFILE_COOKIE)
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

    it('updatePhotoUrl() updates the cshtrkp cookie', async () => {
        mockGetProfile.mockResolvedValue(mockUser)
        const store = useProfileStore()
        await store.loadProfile()

        store.updatePhotoUrl('https://cdn.test/photo.jpg')

        expect(store.cachedProfile?.photoUrl).toBe('https://cdn.test/photo.jpg')
        const match = document.cookie.match(/cshtrkp=([^;]*)/)
        expect(match).not.toBeNull()
        const decoded = JSON.parse(decodeURIComponent(match![1]))
        expect(decoded.photoUrl).toBe('https://cdn.test/photo.jpg')
    })

    it('updatePhotoUrl() is a no-op when profile is null', () => {
        const store = useProfileStore()
        expect(() => store.updatePhotoUrl('https://cdn.test/photo.jpg')).not.toThrow()
        expect(store.profile).toBeNull()
    })
})
