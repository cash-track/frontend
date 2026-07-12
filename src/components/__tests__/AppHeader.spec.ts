import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed, reactive, nextTick } from 'vue'
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

// Mutable color-mode "stored preference" (mode.store.value) plus the "resolved" device
// scheme (mode.value when store === 'auto') so tests can simulate all 4 trigger states:
// manual light, manual dark, auto+resolved-light, auto+resolved-dark. Mirrors VueUse's
// real useColorMode() shape: a writable ref whose setter feeds back into `.store`, plus
// a `.store` ref exposing the raw stored value (unlike `.value`, which VueUse resolves
// 'auto' down to the live system light/dark).
const colorModeState = vi.hoisted(() => ({
    store: 'light' as 'light' | 'dark' | 'auto',
    resolved: 'light' as 'light' | 'dark',
}))

vi.mock('@vueuse/core', async importOriginal => {
    const actual = await importOriginal<typeof import('@vueuse/core')>()
    return {
        ...actual,
        useColorMode: () => {
            const store = ref(colorModeState.store)
            const resolved = ref(colorModeState.resolved)
            return Object.assign(
                computed({
                    get: () => (store.value === 'auto' ? resolved.value : store.value),
                    set: v => { store.value = v },
                }),
                { store },
            )
        },
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
        colorModeState.store = 'light'
        colorModeState.resolved = 'light'
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

    it('theme toggle button has aria-label set to theme.theme i18n key', () => {
        const wrapper = mountHeader()
        const btn = wrapper.find('[aria-label="theme.theme"]')
        expect(btn.exists()).toBe(true)
    })

    it('theme trigger: stored light -> resolved icon is sun, no system badge', () => {
        colorModeState.store = 'light'
        const wrapper = mountHeader()
        const vm = wrapper.vm as unknown as { resolvedThemeIcon: string; isSystemTheme: boolean }
        expect(vm.resolvedThemeIcon).toBe('i-lucide-sun')
        expect(vm.isSystemTheme).toBe(false)
    })

    it('theme trigger: stored dark -> resolved icon is moon, no system badge', () => {
        colorModeState.store = 'dark'
        const wrapper = mountHeader()
        const vm = wrapper.vm as unknown as { resolvedThemeIcon: string; isSystemTheme: boolean }
        expect(vm.resolvedThemeIcon).toBe('i-lucide-moon')
        expect(vm.isSystemTheme).toBe(false)
    })

    it('theme trigger: stored auto + resolved light -> sun icon with system badge shown', () => {
        colorModeState.store = 'auto'
        colorModeState.resolved = 'light'
        const wrapper = mountHeader()
        const vm = wrapper.vm as unknown as { resolvedThemeIcon: string; isSystemTheme: boolean }
        expect(vm.resolvedThemeIcon).toBe('i-lucide-sun')
        expect(vm.isSystemTheme).toBe(true)
    })

    it('theme trigger: stored auto + resolved dark -> moon icon with system badge shown', () => {
        colorModeState.store = 'auto'
        colorModeState.resolved = 'dark'
        const wrapper = mountHeader()
        const vm = wrapper.vm as unknown as { resolvedThemeIcon: string; isSystemTheme: boolean }
        expect(vm.resolvedThemeIcon).toBe('i-lucide-moon')
        expect(vm.isSystemTheme).toBe(true)
    })

    it('theme menu exposes Light/Dark/System checkbox items with the stored one checked', () => {
        colorModeState.store = 'dark'
        const wrapper = mountHeader()
        const vm = wrapper.vm as unknown as {
            themeMenuItems: { label: string; type?: string; checked?: boolean }[][]
        }
        const items = vm.themeMenuItems[0]
        expect(items.map(i => i.label)).toEqual(['theme.light', 'theme.dark', 'theme.system'])
        expect(items.every(i => i.type === 'checkbox')).toBe(true)
        expect(items.find(i => i.label === 'theme.dark')?.checked).toBe(true)
        expect(items.find(i => i.label === 'theme.light')?.checked).toBe(false)
        expect(items.find(i => i.label === 'theme.system')?.checked).toBe(false)
    })

    it('selecting System (auto) restores automatic mode and shows the system badge', async () => {
        colorModeState.store = 'light'
        colorModeState.resolved = 'light'
        const wrapper = mountHeader()
        const vm = wrapper.vm as unknown as {
            resolvedThemeIcon: string
            isSystemTheme: boolean
            themeMenuItems: { label: string; checked?: boolean; onSelect?: () => void }[][]
        }
        expect(vm.resolvedThemeIcon).toBe('i-lucide-sun')
        expect(vm.isSystemTheme).toBe(false)

        vm.themeMenuItems[0].find(i => i.label === 'theme.system')?.onSelect?.()
        await nextTick()

        // Resolves through the mocked 'resolved' (device) scheme, still light here —
        // only the system badge switches, per the composite icon design.
        expect(vm.resolvedThemeIcon).toBe('i-lucide-sun')
        expect(vm.isSystemTheme).toBe(true)
        // The menu re-renders with System checked and Light no longer checked.
        expect(vm.themeMenuItems[0].find(i => i.label === 'theme.system')?.checked).toBe(true)
        expect(vm.themeMenuItems[0].find(i => i.label === 'theme.light')?.checked).toBe(false)
    })

    it('selecting Dark pins the dark preference and hides the system badge', async () => {
        colorModeState.store = 'auto'
        colorModeState.resolved = 'light'
        const wrapper = mountHeader()
        const vm = wrapper.vm as unknown as {
            resolvedThemeIcon: string
            isSystemTheme: boolean
            themeMenuItems: { label: string; onSelect?: () => void }[][]
        }
        vm.themeMenuItems[0].find(i => i.label === 'theme.dark')?.onSelect?.()
        await nextTick()

        expect(vm.resolvedThemeIcon).toBe('i-lucide-moon')
        expect(vm.isSystemTheme).toBe(false)
    })

    it('language selector button has aria-label set to language i18n key', () => {
        const wrapper = mountHeader()
        const btn = wrapper.find('[aria-label="language"]')
        expect(btn.exists()).toBe(true)
    })
})
