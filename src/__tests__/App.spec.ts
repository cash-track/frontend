import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, shallowRef, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// -- window.location.href spy -------------------------------------------------
const hrefSpy = vi.fn()
vi.stubGlobal('window', { location: { set href(v: string) { hrefSpy(v) } } })

// -- external module mocks ----------------------------------------------------
vi.mock('@unhead/vue', () => ({
    useHead: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (k: string) => k,
        locale: ref('en'),
    }),
    createI18n: () => ({
        global: { locale: ref('en'), setLocaleMessage: vi.fn() },
        install: vi.fn(),
    }),
}))

vi.mock('@/lang', () => ({
    default: { install: vi.fn() },
    locales: [{ code: 'en', name: 'English', flag: '🇺🇸' }],
    loadLocaleAsync: vi.fn(),
}))

vi.mock('vue-router', () => ({
    RouterView: { template: '<div class="router-view-stub" />' },
    useRouter: () => ({ currentRoute: { value: { matched: [], params: {}, fullPath: '/' } } }),
    createRouter: () => ({ beforeEach: vi.fn(), install: vi.fn() }),
    createWebHistory: () => ({}),
}))

vi.mock('@/router', () => ({
    default: { beforeEach: vi.fn(), install: vi.fn() },
    setDocumentTitle: vi.fn(),
}))

vi.mock('@/shared/links', () => ({
    webSiteLink: (p: string) => `https://cash-track.app${p}`,
}))

vi.mock('@/api/profile', () => ({
    getProfile: vi.fn().mockRejectedValue(new Error('Unauthorized')),
}))
vi.mock('@/api/auth', () => ({
    logout: vi.fn().mockResolvedValue({}),
}))

// -- store mocks (manual so we can control loading/isLogged in each test) ------
const mockLoading = shallowRef(true)
const mockIsLogged = shallowRef(false)
const mockLoadProfile = vi.fn()

vi.mock('@/stores/profile', () => ({
    useProfileStore: () => ({
        loading: mockLoading,
        loadProfile: mockLoadProfile,
    }),
}))

vi.mock('@/stores/auth', () => ({
    useAuthStore: () => ({
        isLogged: mockIsLogged,
    }),
}))

vi.mock('@/stores/locale', () => ({
    useLocaleStore: () => ({ loadCachedLocale: vi.fn() }),
    syncLocaleWithI18n: vi.fn(),
}))

// -- component stubs for Nuxt UI auto-imports ---------------------------------
const stubs = {
    UApp: { template: '<div><slot /></div>' },
    UContainer: { template: '<div><slot /></div>' },
    AppHeader: { template: '<div />' },
    AppFooter: { template: '<div />' },
    EmailIsNotConfirmedAlert: { template: '<div class="email-alert-stub" />' },
}

// -- import App after all mocks are set up ------------------------------------
import App from '../App.vue'

describe('App.vue', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        hrefSpy.mockClear()
        mockLoadProfile.mockClear()
        mockLoading.value = true
        mockIsLogged.value = false
    })

    it('does not redirect while loading is true', async () => {
        mockLoading.value = true
        mockIsLogged.value = false
        mount(App, { global: { stubs } })
        await nextTick()
        expect(hrefSpy).not.toHaveBeenCalled()
    })

    it('redirects to website home when loading completes and user is not logged in', async () => {
        mockLoading.value = true
        mockIsLogged.value = false
        mount(App, { global: { stubs } })
        await nextTick()

        // simulate loadProfile() completing without auth
        mockLoading.value = false
        await nextTick()

        expect(hrefSpy).toHaveBeenCalledWith('https://cash-track.app/')
    })

    it('does not redirect when loading completes and user IS logged in', async () => {
        mockLoading.value = true
        mockIsLogged.value = false
        mount(App, { global: { stubs } })
        await nextTick()

        // simulate successful loadProfile()
        mockIsLogged.value = true
        mockLoading.value = false
        await nextTick()

        expect(hrefSpy).not.toHaveBeenCalled()
    })

    it('renders the app shell immediately and mounts the route while loading (no generic preloader)', async () => {
        mockLoading.value = true
        mockIsLogged.value = false
        const wrapper = mount(App, { global: { stubs } })
        await nextTick()
        // Shell (header+footer wrapper) renders immediately — old UX restored
        expect(wrapper.find('.min-h-dvh').exists()).toBe(true)
        // No generic full-page preloader anymore
        expect(wrapper.find('.animate-pulse').exists()).toBe(false)
        // Route is mounted during the profile-load window so each page shows its OWN skeletons
        expect(wrapper.find('.router-view-stub').exists()).toBe(true)
        // Email-not-confirmed alert must NOT flash before login is confirmed
        expect(wrapper.find('.email-alert-stub').exists()).toBe(false)
    })

    it('unmounts the route once confirmed logged-out, but keeps the shell', async () => {
        mockLoading.value = false
        mockIsLogged.value = false
        const wrapper = mount(App, { global: { stubs } })
        await nextTick()
        // Shell still renders (header/footer always present)
        expect(wrapper.find('.min-h-dvh').exists()).toBe(true)
        // Route is not mounted — avoids showing stale authenticated content while the redirect fires
        expect(wrapper.find('.router-view-stub').exists()).toBe(false)
    })

    it('mounts the route and shows the email alert when logged in', async () => {
        mockLoading.value = false
        mockIsLogged.value = true
        const wrapper = mount(App, { global: { stubs } })
        await nextTick()
        expect(wrapper.find('.router-view-stub').exists()).toBe(true)
        expect(wrapper.find('.email-alert-stub').exists()).toBe(true)
    })
})
