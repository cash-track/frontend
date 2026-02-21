
export function webSiteLink(path: string): string {
    return import.meta.env.VITE_WEBSITE_URL + path
}
