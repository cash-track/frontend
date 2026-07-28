import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { themeCookieStorage, COOKIE_NAME } from '../themeCookie'

const LEGACY_KEY = 'vueuse-color-scheme'

let cookieJar: Record<string, string>
let writes: string[]

// jsdom's cookie jar enforces Domain/Path against the test origin and would silently drop
// the domain-scoped cookies this module writes. This jar records every write (so the
// attribute string can be asserted) and reflects name=value pairs back through the getter.
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
    window.localStorage.clear()
})

afterEach(() => {
    delete window.__APP_CONFIG__
})

describe('themeCookieStorage', () => {
    it('translates cookie value "system" to vueuse "auto" on read', () => {
        document.cookie = `${COOKIE_NAME}=system`

        expect(themeCookieStorage.getItem(COOKIE_NAME)).toBe('auto')
    })

    it('translates vueuse "auto" to cookie value "system" on write', () => {
        themeCookieStorage.setItem(COOKIE_NAME, 'auto')

        expect(cookieJar[COOKIE_NAME]).toBe('system')
    })

    it.each(['light', 'dark'])('passes "%s" through unchanged on read', (value) => {
        document.cookie = `${COOKIE_NAME}=${value}`

        expect(themeCookieStorage.getItem(COOKIE_NAME)).toBe(value)
    })

    it.each(['light', 'dark'])('passes "%s" through unchanged on write', (value) => {
        themeCookieStorage.setItem(COOKIE_NAME, value)

        expect(cookieJar[COOKIE_NAME]).toBe(value)
    })

    it('derives the cookie Domain from VITE_WEBSITE_URL', () => {
        window.__APP_CONFIG__ = { VITE_WEBSITE_URL: 'https://cash-track.app' }

        themeCookieStorage.setItem(COOKIE_NAME, 'dark')

        expect(writes.at(-1)).toContain('Domain=.cash-track.app')
    })

    it('falls back to a host-only cookie (no Domain attribute) when VITE_WEBSITE_URL is unparseable', () => {
        window.__APP_CONFIG__ = { VITE_WEBSITE_URL: 'not-a-valid-url' }

        themeCookieStorage.setItem(COOKIE_NAME, 'dark')

        expect(writes.at(-1)).not.toContain('Domain=')
    })

    it('seeds the cookie from the legacy localStorage key when the cookie is absent', () => {
        window.localStorage.setItem(LEGACY_KEY, 'dark')

        expect(themeCookieStorage.getItem(COOKIE_NAME)).toBe('dark')
        expect(cookieJar[COOKIE_NAME]).toBe('dark')
    })

    it('translates a legacy "auto" localStorage value into a "system" cookie during migration', () => {
        window.localStorage.setItem(LEGACY_KEY, 'auto')

        expect(themeCookieStorage.getItem(COOKIE_NAME)).toBe('auto')
        expect(cookieJar[COOKIE_NAME]).toBe('system')
    })

    it('ignores the legacy localStorage key once the shared cookie already exists', () => {
        document.cookie = `${COOKIE_NAME}=light`
        window.localStorage.setItem(LEGACY_KEY, 'dark')

        expect(themeCookieStorage.getItem(COOKIE_NAME)).toBe('light')
    })

    it('returns null when neither the cookie nor the legacy key exist', () => {
        expect(themeCookieStorage.getItem(COOKIE_NAME)).toBeNull()
    })

    it('removes the cookie', () => {
        document.cookie = `${COOKIE_NAME}=dark`

        themeCookieStorage.removeItem(COOKIE_NAME)

        expect(cookieJar[COOKIE_NAME]).toBeUndefined()
    })
})
