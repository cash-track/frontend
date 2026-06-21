import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))
vi.mock('@/api/auth', () => ({ logout: vi.fn().mockResolvedValue({}) }))

const assignSpy = vi.fn()
vi.stubGlobal('window', { location: { set href(v: string) { assignSpy(v) } } })

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

describe('useAuthStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
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
})
