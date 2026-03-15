export function webSiteLink(path: string): string {
    return import.meta.env.VITE_WEBSITE_URL + path
}

export function gatewayLink(path: string): string {
    return import.meta.env.VITE_GATEWAY_URL + path
}
