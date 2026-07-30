import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))
vi.mock('@/api/auth', () => ({ logout: vi.fn().mockResolvedValue({}) }))

const assignSpy = vi.fn()
vi.stubGlobal('window', { location: { set href(v: string) { assignSpy(v) } } })

import { useAuthStore } from '../auth'
import { PROFILE_COOKIE, writeCachedProfile } from '@/shared/profileCookie'
import type { User } from '@/api/models/user'

let cookieJar: Record<string, string>

// See shared/__tests__/sharedCookie.spec.ts for why jsdom's native cookie jar is replaced.
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

describe('useAuthStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        installCookieJar()
    })

    it('initial state is logged out', () => {
        const store = useAuthStore()
        expect(store.isLogged).toBe(false)
        expect(store.isEmailConfirmed).toBe(false)
    })

    it('login() sets isLogged and isEmailConfirmed from profile', () => {
        const store = useAuthStore()
        store.login(mockUser)
        expect(store.isLogged).toBe(true)
        expect(store.isEmailConfirmed).toBe(true)
    })

    it('login() sets isEmailConfirmed=false when profile has unconfirmed email', () => {
        const store = useAuthStore()
        store.login({ ...mockUser, isEmailConfirmed: false } as User)
        expect(store.isEmailConfirmed).toBe(false)
    })

    it('logout() resets state and redirects to website root', async () => {
        const store = useAuthStore()
        store.login(mockUser)
        await store.logout()
        expect(store.isLogged).toBe(false)
        expect(store.isEmailConfirmed).toBe(false)
        expect(assignSpy).toHaveBeenCalledWith('https://website.test/')
    })

    it('logout() clears the cshtrkp cookie', async () => {
        writeCachedProfile({
            v: 1,
            id: 1,
            name: 'Alice',
            lastName: null,
            nickName: 'alice',
            email: 'alice@test.com',
            photoUrl: null,
            isEmailConfirmed: true,
            locale: 'en',
        })
        expect(document.cookie).toContain(PROFILE_COOKIE)

        const store = useAuthStore()
        store.login(mockUser)
        await store.logout()

        expect(document.cookie).not.toContain(PROFILE_COOKIE)
    })
})
