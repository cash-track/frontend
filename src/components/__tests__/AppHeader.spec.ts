import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, reactive, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AppHeader from '../AppHeader.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

const mockRoute = reactive({ fullPath: '/' })

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useRoute: () => mockRoute,
    RouterLink: { template: '<a><slot /></a>' },
}))

// Mutable matchMedia state so tests can simulate desktop (md+) vs mobile viewports.
const mediaState = vi.hoisted(() => ({ matches: false }))

vi.mock('@vueuse/core', async importOriginal => {
    const actual = await importOriginal<typeof import('@vueuse/core')>()
    return {
        ...actual,
        useColorMode: () => ref('light'),
        useMediaQuery: () => ({ value: mediaState.matches }),
    }
})

vi.mock('@/api/profile', () => ({
    updateLocale: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/shared/links', () => ({
    webSiteLink: (path: string) => `https://cash-track.app${path}`,
}))

vi.mock('@/lang', () => ({
    locales: [
        { code: 'en', name: 'English', flag: '🇺🇸' },
    ],
    loadLocaleAsync: vi.fn(),
}))

vi.mock('@/api/auth', () => ({
    logout: vi.fn().mockResolvedValue(undefined),
}))

// UButton renders attributes (like aria-*) on its root <a> wrapper via ULink/Link.
// We find the hamburger trigger by aria-label rather than by stub structure.

describe('AppHeader', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockRoute.fullPath = '/'
        mediaState.matches = false
    })

    function mountHeader() {
        return mount(AppHeader, {
            global: {
                stubs: {
                    HamburgerMenu: {
                        template: '<span :data-is-open="isOpen" />',
                        props: ['isOpen'],
                    },
                },
            },
        })
    }

    it('hamburger trigger has aria-label set to the menu i18n key', () => {
        const wrapper = mountHeader()
        const trigger = wrapper.find('[aria-label="menu"]')
        expect(trigger.exists()).toBe(true)
    })

    it('hamburger trigger has aria-expanded="false" when menu is closed', () => {
        const wrapper = mountHeader()
        const trigger = wrapper.find('[aria-label="menu"]')
        expect(trigger.attributes('aria-expanded')).toBe('false')
    })

    it('hamburger trigger has aria-expanded="true" after click', async () => {
        const wrapper = mountHeader()
        const trigger = wrapper.find('[aria-label="menu"]')
        await trigger.trigger('click')
        expect(trigger.attributes('aria-expanded')).toBe('true')
    })

    it('HamburgerMenu receives isOpen=false initially', () => {
        const wrapper = mountHeader()
        const hamburgerMenu = wrapper.find('[data-is-open]')
        expect(hamburgerMenu.attributes('data-is-open')).toBe('false')
    })

    it('HamburgerMenu receives isOpen=true after hamburger click', async () => {
        const wrapper = mountHeader()
        await wrapper.find('[aria-label="menu"]').trigger('click')
        const hamburgerMenu = wrapper.find('[data-is-open]')
        expect(hamburgerMenu.attributes('data-is-open')).toBe('true')
    })

    it('menu closes when route.fullPath changes (watcher coverage)', async () => {
        const wrapper = mountHeader()

        // open the menu via click
        await wrapper.find('[aria-label="menu"]').trigger('click')
        expect(wrapper.find('[aria-label="menu"]').attributes('aria-expanded')).toBe('true')

        // mutate the reactive route — this fires the watch(() => route.fullPath, ...) watcher
        mockRoute.fullPath = '/wallets'
        await nextTick()

        // the watcher must have set isHeaderOpened back to false
        expect(wrapper.find('[aria-label="menu"]').attributes('aria-expanded')).toBe('false')
    })

    it('forces the menu open on desktop (md+) even when the hamburger is untouched', () => {
        mediaState.matches = true
        const wrapper = mountHeader()
        const vm = wrapper.vm as unknown as { isMenuOpen: boolean; isHeaderOpened: boolean }
        // The hamburger is md:hidden on desktop, so isHeaderOpened stays false,
        // but the collapsible must still be open so the nav is visible.
        expect(vm.isHeaderOpened).toBe(false)
        expect(vm.isMenuOpen).toBe(true)
    })

    it('keeps the menu closed by default on mobile (collapsible gated by the hamburger)', () => {
        const wrapper = mountHeader()
        const vm = wrapper.vm as unknown as { isMenuOpen: boolean }
        expect(vm.isMenuOpen).toBe(false)
    })

    it('hamburger button has aria-controls pointing to the menu panel id', () => {
        const wrapper = mountHeader()
        const trigger = wrapper.find('[aria-label="menu"]')
        expect(trigger.attributes('aria-controls')).toBe('app-header-menu')
    })

    it('dark-mode toggle button has aria-label set to darkMode i18n key', () => {
        const wrapper = mountHeader()
        const btn = wrapper.find('[aria-label="darkMode"]')
        expect(btn.exists()).toBe(true)
    })

    it('language selector button has aria-label set to language i18n key', () => {
        const wrapper = mountHeader()
        const btn = wrapper.find('[aria-label="language"]')
        expect(btn.exists()).toBe(true)
    })
})
