import { getEnv } from './env'

export function webSiteLink(path: string): string {
    return getEnv('VITE_WEBSITE_URL') + path
}

export function gatewayLink(path: string): string {
    return getEnv('VITE_GATEWAY_URL') + path
}

export function releaseTagLink(tag: string): string {
    return `https://github.com/cash-track/frontend/releases/tag/${tag}`
}

export function commitLink(sha: string): string {
    return `https://github.com/cash-track/frontend/commit/${sha}`
}

// Uptime monitor. Environment-independent, so it lives here as a literal rather than an env var.
export const STATUS_PAGE_URL = 'https://status.cash-track.app'

export function statusPageLink(): string {
    return STATUS_PAGE_URL
}
