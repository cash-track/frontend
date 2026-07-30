import { readRawCookie, writeRawCookie, deleteRawCookie } from './sharedCookie'

// Display cache shared with the website. Never an auth signal.
export const PROFILE_COOKIE = 'cshtrkp'

// 7 days — outlives the ~6.6 day refresh token, so the cache dies with the session.
const PROFILE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

const SCHEMA_VERSION = 1

export interface CachedProfile {
    v: 1
    id: number
    name: string
    lastName: string | null
    nickName: string
    email: string
    photoUrl: string | null
    isEmailConfirmed: boolean
    locale: string
}

function isCachedProfile(value: unknown): value is CachedProfile {
    if (!value || typeof value !== 'object') return false
    const d = value as Record<string, unknown>
    return (
        d.v === SCHEMA_VERSION &&
        typeof d.id === 'number' &&
        typeof d.name === 'string' &&
        (d.lastName === null || typeof d.lastName === 'string') &&
        typeof d.nickName === 'string' &&
        typeof d.email === 'string' &&
        (d.photoUrl === null || typeof d.photoUrl === 'string') &&
        typeof d.isEmailConfirmed === 'boolean' &&
        typeof d.locale === 'string'
    )
}

// Any shape mismatch means "no cache" — must never throw during app startup.
export function readCachedProfile(): CachedProfile | null {
    const raw = readRawCookie(PROFILE_COOKIE)
    if (!raw) return null

    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        return null
    }

    if (!isCachedProfile(parsed)) {
        return null
    }

    return parsed
}

export function writeCachedProfile(profile: CachedProfile) {
    writeRawCookie(PROFILE_COOKIE, JSON.stringify(profile), PROFILE_COOKIE_MAX_AGE)
}

// Only on logout or a 401 (see stores/auth.ts, api/client.ts). Never on a parse failure
// or transient error — the apps deploy independently and a valid cache must survive.
export function clearCachedProfile() {
    deleteRawCookie(PROFILE_COOKIE)
}
