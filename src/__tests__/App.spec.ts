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

vi.mock('@/api/profile', () => ({
    getProfile: vi.fn().mockRejectedValue(new Error('Unauthorized')),
}))
vi.mock('@/api/auth', () => ({
    logout: vi.fn().mockResolvedValue({}),
}))

// -- store mocks (manual so we can control loading/isLogged/failed in each test) ---
const mockLoading = shallowRef(true)
const mockIsLogged = shallowRef(false)
const mockFailed = shallowRef(false)
const mockLastError = shallowRef<unknown>(null)
const mockLoadProfile = vi.fn()

vi.mock('@/stores/profile', () => ({
    useProfileStore: () => ({
        loading: mockLoading,
        failed: mockFailed,
        lastError: mockLastError,
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

// -- component stubs ----------------------------------------------------------
const loadErrorAlertStub = {
    name: 'LoadErrorAlert',
    props: ['title', 'error'],
    emits: ['retry'],
    template: '<div class="load-error-alert-stub" />',
}

const stubs = {
    UApp: { template: '<div><slot /></div>' },
    UContainer: { template: '<div><slot /></div>' },
    Container: { template: '<div><slot /></div>' },
    AppHeader: { template: '<div />' },
    AppFooter: { template: '<div />' },
    EmailIsNotConfirmedAlert: { template: '<div class="email-alert-stub" />' },
    LoadErrorAlert: loadErrorAlertStub,
    AppUpdatePrompt: { template: '<div />' },
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
        mockFailed.value = false
        mockLastError.value = null
    })

    it('does not set window.location.href when loading is true', async () => {
        mockLoading.value = true
        mockIsLogged.value = false
        mount(App, { global: { stubs } })
        await nextTick()
        expect(hrefSpy).not.toHaveBeenCalled()
    })

    it('does not set window.location.href when loading completes with failure (shows alert instead)', async () => {
        mockLoading.value = false
        mockIsLogged.value = false
        mockFailed.value = true
        mount(App, { global: { stubs } })
        await nextTick()
        expect(hrefSpy).not.toHaveBeenCalled()
    })

    it('renders LoadErrorAlert when failed is true', async () => {
        mockLoading.value = false
        mockIsLogged.value = false
        mockFailed.value = true
        const wrapper = mount(App, { global: { stubs } })
        await nextTick()
        expect(wrapper.find('.load-error-alert-stub').exists()).toBe(true)
    })

    it('LoadErrorAlert retry event calls profileStore.loadProfile', async () => {
        mockLoading.value = false
        mockIsLogged.value = false
        mockFailed.value = true
        const wrapper = mount(App, { global: { stubs } })
        await nextTick()

        mockLoadProfile.mockClear()  // clear the initial onMounted call
        const alert = wrapper.findComponent(loadErrorAlertStub)
        await alert.vm.$emit('retry')
        await nextTick()
        expect(mockLoadProfile).toHaveBeenCalledTimes(1)
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
        // Shell (header+footer wrapper) renders immediately
        expect(wrapper.find('.min-h-dvh').exists()).toBe(true)
        // No generic full-page preloader
        expect(wrapper.find('.animate-pulse').exists()).toBe(false)
        // Route is mounted during the profile-load window so each page shows its OWN skeletons
        expect(wrapper.find('.router-view-stub').exists()).toBe(true)
        // Email-not-confirmed alert must NOT flash before login is confirmed
        expect(wrapper.find('.email-alert-stub').exists()).toBe(false)
    })

    it('does not render RouterView when loading=false, isLogged=false, failed=false', async () => {
        mockLoading.value = false
        mockIsLogged.value = false
        mockFailed.value = false
        const wrapper = mount(App, { global: { stubs } })
        await nextTick()
        // Shell still renders
        expect(wrapper.find('.min-h-dvh').exists()).toBe(true)
        // Route is not mounted
        expect(wrapper.find('.router-view-stub').exists()).toBe(false)
        // No error alert either (not failed)
        expect(wrapper.find('.load-error-alert-stub').exists()).toBe(false)
    })

    it('mounts the route and shows the email alert when logged in', async () => {
        mockLoading.value = false
        mockIsLogged.value = true
        const wrapper = mount(App, { global: { stubs } })
        await nextTick()
        expect(wrapper.find('.router-view-stub').exists()).toBe(true)
        expect(wrapper.find('.email-alert-stub').exists()).toBe(true)
    })

    it('does not render LoadErrorAlert when loading succeeds', async () => {
        mockLoading.value = false
        mockIsLogged.value = true
        mockFailed.value = false
        const wrapper = mount(App, { global: { stubs } })
        await nextTick()
        expect(wrapper.find('.load-error-alert-stub').exists()).toBe(false)
    })
})
