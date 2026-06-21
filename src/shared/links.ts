import { getEnv } from './env'

export function webSiteLink(path: string): string {
    return getEnv('VITE_WEBSITE_URL') + path
}

export function gatewayLink(path: string): string {
    return getEnv('VITE_GATEWAY_URL') + path
}
