import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parentDomain, readRawCookie, writeRawCookie, deleteRawCookie } from '../sharedCookie'

let cookieJar: Record<string, string>
let writes: string[]

// See themeCookie.spec.ts for why jsdom's cookie jar is replaced.
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
})

afterEach(() => {
    delete window.__APP_CONFIG__
})

describe('parentDomain', () => {
    it('derives the hostname from VITE_WEBSITE_URL', () => {
        window.__APP_CONFIG__ = { VITE_WEBSITE_URL: 'https://cash-track.app' }

        expect(parentDomain()).toBe('cash-track.app')
    })

    it('returns null when VITE_WEBSITE_URL is unparseable', () => {
        window.__APP_CONFIG__ = { VITE_WEBSITE_URL: 'not-a-valid-url' }

        expect(parentDomain()).toBeNull()
    })
})

describe('readRawCookie / writeRawCookie / deleteRawCookie', () => {
    it('writes and reads a cookie by name', () => {
        writeRawCookie('foo', 'bar')

        expect(readRawCookie('foo')).toBe('bar')
    })

    it('returns null for a cookie that does not exist', () => {
        expect(readRawCookie('missing')).toBeNull()
    })

    it('scopes the cookie to the parent domain when VITE_WEBSITE_URL is set', () => {
        window.__APP_CONFIG__ = { VITE_WEBSITE_URL: 'https://cash-track.app' }

        writeRawCookie('foo', 'bar')

        expect(writes.at(-1)).toContain('Domain=.cash-track.app')
    })

    it.each(['localhost', '127.0.0.1'])('falls back to a host-only cookie for %s', (host) => {
        window.__APP_CONFIG__ = { VITE_WEBSITE_URL: `http://${host}:3001` }

        writeRawCookie('foo', 'bar')

        expect(writes.at(-1)).not.toContain('Domain=')
    })

    it('deletes a host-only sibling before writing the domain-scoped cookie', () => {
        window.__APP_CONFIG__ = { VITE_WEBSITE_URL: 'https://cash-track.app' }

        writeRawCookie('foo', 'bar')

        expect(writes[0]).toContain('max-age=0')
        expect(writes[1]).toContain('Domain=.cash-track.app')
    })

    it('removes a cookie', () => {
        document.cookie = 'foo=bar'

        deleteRawCookie('foo')

        expect(cookieJar.foo).toBeUndefined()
    })
})
