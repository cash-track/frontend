import type { StorageLike } from '@vueuse/core'
import { readRawCookie, writeRawCookie, deleteRawCookie } from './sharedCookie'
import { fromCookieValue, toCookieValue } from './themeCookieVocabulary'

// Shares the theme with the website via the domain-scoped `cshtrkt` cookie. VueUse stores
// 'auto', the website expects 'system' — this adapter translates between them.

const COOKIE_NAME = 'cshtrkt'
const LEGACY_STORAGE_KEY = 'vueuse-color-scheme'

export const themeCookieStorage: StorageLike = {
    getItem(key) {
        const raw = readRawCookie(key)
        if (raw) {
            return fromCookieValue(raw)
        }

        // One-time migration from the old VueUse localStorage key.
        const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
        if (legacy) {
            writeRawCookie(key, toCookieValue(legacy))
            return legacy
        }

        return null
    },
    setItem(key, value) {
        writeRawCookie(key, toCookieValue(value))
    },
    removeItem(key) {
        deleteRawCookie(key)
    },
}

export { COOKIE_NAME, toCookieValue }
