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

// Deletes both forms: per RFC 6265 a delete only matches an exact (name, domain, path),
// so a domain-scoped cookie survives a host-only delete.
export function deleteRawCookie(name: string) {
    document.cookie = `${name}=; path=/; max-age=0`

    const domain = parentDomain()
    if (domain && domain !== 'localhost' && !/^[\d.]+$/.test(domain)) {
        document.cookie = `${name}=; Domain=.${domain}; path=/; max-age=0`
    }
}

// Always deletes a host-only sibling first — a domain-scoped and host-only
// cookie of the same name can otherwise coexist, and reads become ambiguous.
export function writeRawCookie(name: string, value: string, maxAge: number = COOKIE_MAX_AGE) {
    deleteRawCookie(name)

    const domain = parentDomain()
    const attrs = [
        `${name}=${encodeURIComponent(value)}`,
        'path=/',
        `max-age=${maxAge}`,
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
