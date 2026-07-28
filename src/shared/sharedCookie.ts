import { getEnv } from './env'

// Shared by the cshtrkt (theme) and cshtrkl (locale) cookies — both live 1 year.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function parentDomain(): string | null {
    const websiteUrl = getEnv('VITE_WEBSITE_URL')
    if (!websiteUrl) {
        return null
    }

    try {
        return new URL(websiteUrl).hostname
    } catch {
        return null
    }
}

export function readRawCookie(name: string): string | null {
    const prefix = `${name}=`
    const pair = document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix))

    return pair ? decodeURIComponent(pair.slice(prefix.length)) : null
}

export function deleteRawCookie(name: string) {
    document.cookie = `${name}=; path=/; max-age=0`
}

// Always deletes a host-only sibling first — a domain-scoped and host-only
// cookie of the same name can otherwise coexist, and reads become ambiguous.
export function writeRawCookie(name: string, value: string) {
    deleteRawCookie(name)

    const domain = parentDomain()
    const attrs = [
        `${name}=${encodeURIComponent(value)}`,
        'path=/',
        `max-age=${COOKIE_MAX_AGE}`,
        'SameSite=Lax',
    ]

    // localhost/IP can't take a leading-dot Domain — fall back to host-only.
    if (domain && domain !== 'localhost' && !/^[\d.]+$/.test(domain)) {
        attrs.push(`Domain=.${domain}`)
    }

    if (window.location.protocol === 'https:') {
        attrs.push('Secure')
    }

    document.cookie = attrs.join('; ')
}
