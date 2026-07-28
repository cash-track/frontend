import { shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import { loadLocaleAsync } from '@/lang'
import { readRawCookie, writeRawCookie } from '@/shared/sharedCookie'

// Domain-scoped (see shared/sharedCookie.ts) so the marketing website sees it too.
export const LOCALE_COOKIE = 'cshtrkl'

function readLocaleCookie(): string | null {
    return readRawCookie(LOCALE_COOKIE)
}

function writeLocaleCookie(locale: string) {
    writeRawCookie(LOCALE_COOKIE, locale)
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

    // Applies a locale another tab already wrote to the cookie (see useCrossTabSync).
    // Distinct from localeChange only in that it skips the write-back — it's already correct.
    function applyExternalLocale(newLocale: 'en' | 'uk') {
        locale.value = newLocale
    }

    return { locale, localeChange, loadCachedLocale, applyExternalLocale }
})

export function syncLocaleWithI18n() {
    const localeStore = useLocaleStore()

    watch(
        () => localeStore.locale,
        (val) => { loadLocaleAsync(val) },
        { immediate: true },
    )
}
