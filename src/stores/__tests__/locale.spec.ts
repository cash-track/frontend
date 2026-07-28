import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLocaleStore, LOCALE_COOKIE } from '../locale'

let cookieJar: Record<string, string>
let writes: string[]

// See shared/__tests__/themeCookie.spec.ts for why jsdom's cookie jar is replaced.
function installCookieJar() {
    cookieJar = {}
    writes = []
    Object.defineProperty(document, 'cookie', {
        configurable: true,
        get() {
            return Object.entries(cookieJar)
                .map(([name, value]) => `${name}=${value}`)
                .join('; ')
        },
        set(raw: string) {
            writes.push(raw)
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

beforeEach(() => {
    installCookieJar()
    setActivePinia(createPinia())
})

afterEach(() => {
    delete window.__APP_CONFIG__
})

describe('useLocaleStore', () => {
    it('localeChange writes the cshtrkl cookie', () => {
        const store = useLocaleStore()

        store.localeChange('uk')

        expect(cookieJar[LOCALE_COOKIE]).toBe('uk')
    })

    it('scopes the cookie to the parent domain when VITE_WEBSITE_URL is set', () => {
        window.__APP_CONFIG__ = { VITE_WEBSITE_URL: 'https://cash-track.app' }
        const store = useLocaleStore()

        store.localeChange('uk')

        expect(writes.at(-1)).toContain('Domain=.cash-track.app')
    })

    it('falls back to a host-only cookie when VITE_WEBSITE_URL is unparseable', () => {
        window.__APP_CONFIG__ = { VITE_WEBSITE_URL: 'not-a-valid-url' }
        const store = useLocaleStore()

        store.localeChange('uk')

        expect(writes.at(-1)).not.toContain('Domain=')
    })

    it('uses SameSite=Lax', () => {
        const store = useLocaleStore()

        store.localeChange('uk')

        expect(writes.at(-1)).toContain('SameSite=Lax')
    })

    it('deletes a host-only sibling before writing (single-cookie invariant)', () => {
        window.__APP_CONFIG__ = { VITE_WEBSITE_URL: 'https://cash-track.app' }
        const store = useLocaleStore()

        store.localeChange('uk')

        expect(writes[0]).toContain('max-age=0')
        expect(writes[1]).toContain('Domain=.cash-track.app')
    })

    it('loadCachedLocale reads a supported locale from the cookie', () => {
        document.cookie = `${LOCALE_COOKIE}=uk`
        const store = useLocaleStore()

        store.loadCachedLocale()

        expect(store.locale).toBe('uk')
    })

    it('loadCachedLocale falls back to the default locale when the cookie is absent', () => {
        const store = useLocaleStore()

        store.loadCachedLocale()

        expect(store.locale).toBe('en')
        expect(cookieJar[LOCALE_COOKIE]).toBe('en')
    })

    it('loadCachedLocale ignores an unsupported cookie value', () => {
        document.cookie = `${LOCALE_COOKIE}=fr`
        const store = useLocaleStore()

        store.loadCachedLocale()

        expect(store.locale).toBe('en')
    })

    it('applyExternalLocale sets the locale without writing the cookie', () => {
        const store = useLocaleStore()
        store.localeChange('en')
        writes.length = 0

        store.applyExternalLocale('uk')

        expect(store.locale).toBe('uk')
        expect(writes).toHaveLength(0)
    })
})
