import { describe, it, expect, beforeEach } from 'vitest'
import {
    PROFILE_COOKIE,
    readCachedProfile,
    writeCachedProfile,
    clearCachedProfile,
    type CachedProfile,
} from '../profileCookie'

let cookieJar: Record<string, string>

// See themeCookie.spec.ts / sharedCookie.spec.ts for why jsdom's cookie jar is replaced.
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

beforeEach(() => {
    installCookieJar()
})

const validProfile: CachedProfile = {
    v: 1,
    id: 1,
    name: 'Ann',
    lastName: null,
    nickName: 'ann',
    email: 'a@b.c',
    photoUrl: null,
    isEmailConfirmed: true,
    locale: 'en',
}

describe('writeCachedProfile / readCachedProfile', () => {
    it('round-trips a cached profile', () => {
        writeCachedProfile(validProfile)

        expect(readCachedProfile()).toEqual(validProfile)
    })

    it('returns null when the cookie is missing', () => {
        expect(readCachedProfile()).toBeNull()
    })

    it('returns null for malformed (non-JSON) cookie content but leaves the cookie intact', () => {
        document.cookie = `${PROFILE_COOKIE}=${encodeURIComponent('not-json')}`

        expect(readCachedProfile()).toBeNull()
        expect(document.cookie).toContain(PROFILE_COOKIE)
    })

    it('returns null for a wrong schema version but leaves the cookie intact', () => {
        document.cookie = `${PROFILE_COOKIE}=${encodeURIComponent(JSON.stringify({ ...validProfile, v: 2 }))}`

        expect(readCachedProfile()).toBeNull()
        expect(document.cookie).toContain(PROFILE_COOKIE)
    })

    it('returns null for a wrong-typed field but leaves the cookie intact', () => {
        document.cookie = `${PROFILE_COOKIE}=${encodeURIComponent(JSON.stringify({ ...validProfile, id: '1' }))}`

        expect(readCachedProfile()).toBeNull()
        expect(document.cookie).toContain(PROFILE_COOKIE)
    })
})

describe('clearCachedProfile', () => {
    it('removes the cookie', () => {
        writeCachedProfile(validProfile)

        clearCachedProfile()

        expect(readCachedProfile()).toBeNull()
        expect(document.cookie).not.toContain(PROFILE_COOKIE)
    })
})
