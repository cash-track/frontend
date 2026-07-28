import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useCrossTabSync } from '../useCrossTabSync'
import { useLocaleStore, LOCALE_COOKIE } from '@/stores/locale'

type Mode = Parameters<typeof useCrossTabSync>[0]

const THEME_COOKIE = 'cshtrkt'

let cookieJar: Record<string, string>

// See shared/__tests__/themeCookie.spec.ts for why jsdom's cookie jar is replaced.
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

function setVisibility(state: 'visible' | 'hidden') {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: state })
}

function makeMode(initial: 'light' | 'dark' | 'auto' = 'light'): Mode {
    return { value: initial, store: { value: initial } } as Mode
}

function mountSync(mode: Mode) {
    return mount(defineComponent({
        setup() {
            useCrossTabSync(mode)
            return () => h('div')
        },
    }))
}

describe('useCrossTabSync', () => {
    let wrapper: VueWrapper | undefined

    beforeEach(() => {
        installCookieJar()
        setActivePinia(createPinia())
        setVisibility('visible')
    })

    afterEach(() => {
        wrapper?.unmount()
        wrapper = undefined
    })

    it('applies a locale another tab wrote, on visibilitychange while visible', () => {
        const store = useLocaleStore()
        store.localeChange('en')
        document.cookie = `${LOCALE_COOKIE}=uk`

        wrapper = mountSync(makeMode())
        document.dispatchEvent(new Event('visibilitychange'))

        expect(store.locale).toBe('uk')
    })

    it('does not apply on visibilitychange while hidden', () => {
        const store = useLocaleStore()
        store.localeChange('en')
        document.cookie = `${LOCALE_COOKIE}=uk`

        wrapper = mountSync(makeMode())
        setVisibility('hidden')
        document.dispatchEvent(new Event('visibilitychange'))

        expect(store.locale).toBe('en')
    })

    it('applies a locale another tab wrote, on window focus', () => {
        const store = useLocaleStore()
        store.localeChange('en')
        document.cookie = `${LOCALE_COOKIE}=uk`

        wrapper = mountSync(makeMode())
        window.dispatchEvent(new Event('focus'))

        expect(store.locale).toBe('uk')
    })

    it('ignores an unsupported locale cookie value', () => {
        const store = useLocaleStore()
        store.localeChange('en')
        document.cookie = `${LOCALE_COOKIE}=fr`

        wrapper = mountSync(makeMode())
        document.dispatchEvent(new Event('visibilitychange'))

        expect(store.locale).toBe('en')
    })

    it('does not rewrite the locale cookie when applying an external change', () => {
        const store = useLocaleStore()
        store.localeChange('en')
        document.cookie = `${LOCALE_COOKIE}=uk`

        wrapper = mountSync(makeMode())
        document.dispatchEvent(new Event('visibilitychange'))

        // Still exactly what the "other tab" wrote — applyExternalLocale never re-serializes it.
        expect(cookieJar[LOCALE_COOKIE]).toBe('uk')
    })

    it('applies a theme another tab wrote', () => {
        document.cookie = `${THEME_COOKIE}=dark`
        const mode = makeMode('light')

        wrapper = mountSync(mode)
        document.dispatchEvent(new Event('visibilitychange'))

        expect(mode.value).toBe('dark')
    })

    it('translates the "system" cookie value to "auto" when applying theme', () => {
        document.cookie = `${THEME_COOKIE}=system`
        const mode = makeMode('light')

        wrapper = mountSync(mode)
        document.dispatchEvent(new Event('visibilitychange'))

        expect(mode.value).toBe('auto')
    })

    it('ignores a garbage theme cookie value', () => {
        document.cookie = `${THEME_COOKIE}=banana`
        const mode = makeMode('light')

        wrapper = mountSync(mode)
        document.dispatchEvent(new Event('visibilitychange'))

        expect(mode.value).toBe('light')
    })

    it('does not touch theme when the cookie already matches the current mode', () => {
        document.cookie = `${THEME_COOKIE}=light`
        let sets = 0
        const store = { value: 'light' as 'light' | 'dark' | 'auto' }
        const mode = {
            get value() { return store.value },
            set value(v: 'light' | 'dark' | 'auto') { sets++; store.value = v },
            store,
        } as Mode

        wrapper = mountSync(mode)
        document.dispatchEvent(new Event('visibilitychange'))

        expect(sets).toBe(0)
    })

    it('stops reacting after unmount', () => {
        const store = useLocaleStore()
        store.localeChange('en')

        wrapper = mountSync(makeMode())
        wrapper.unmount()
        wrapper = undefined

        document.cookie = `${LOCALE_COOKIE}=uk`
        document.dispatchEvent(new Event('visibilitychange'))

        expect(store.locale).toBe('en')
    })
})
