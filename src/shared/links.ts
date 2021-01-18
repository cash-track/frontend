import getEnv from '@/shared/env';

export function webSiteLink(path: string): string {
    return getEnv('VUE_APP_WEBSITE_URL') + path
}
