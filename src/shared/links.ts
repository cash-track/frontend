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
