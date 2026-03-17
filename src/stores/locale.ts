import { shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import { loadLocaleAsync } from '@/lang'

const LOCALE_COOKIE = 'cshtrkl'
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 365 days in seconds

function readLocaleCookie(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)cshtrkl=([^;]*)/)
    return match ? decodeURIComponent(match[1]) : null
}

function writeLocaleCookie(locale: string) {
    document.cookie = [
        `${LOCALE_COOKIE}=${encodeURIComponent(locale)}`,
        'path=/',
        `max-age=${COOKIE_MAX_AGE}`,
        'SameSite=Strict',
    ].join('; ')
}

export const useLocaleStore = defineStore('locale', () => {
    const locale = shallowRef<'en' | 'uk'>('en')

    function localeChange(newLocale: 'en' | 'uk') {
        locale.value = newLocale
        writeLocaleCookie(newLocale)
    }

    function loadCachedLocale() {
        const cached = readLocaleCookie()
        if (cached === 'en' || cached === 'uk') {
            locale.value = cached
            writeLocaleCookie(cached)
        } else {
            writeLocaleCookie(locale.value)
        }
    }

    return { locale, localeChange, loadCachedLocale }
})

export function syncLocaleWithI18n() {
    const localeStore = useLocaleStore()

    watch(
        () => localeStore.locale,
        (val) => { loadLocaleAsync(val) },
        { immediate: true },
    )
}
