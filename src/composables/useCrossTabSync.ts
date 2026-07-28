import { onMounted, onUnmounted } from 'vue'
import type { useColorMode } from '@vueuse/core'
import { useLocaleStore } from '@/stores/locale'
import { readRawCookie } from '@/shared/sharedCookie'
import { fromCookieValue } from '@/shared/themeCookieVocabulary'

const THEME_COOKIE = 'cshtrkt'
const LOCALE_COOKIE = 'cshtrkl'

type ColorMode = ReturnType<typeof useColorMode>

// VueUse only wires the native `storage` event for a real Storage, and both cookies are
// backed by a custom StorageLike — so re-read them on focus/visibility instead.
// Takes AppHeader's `mode` rather than calling useColorMode() again, which would be an
// independent instance.
export function useCrossTabSync(mode: ColorMode) {
    const localeStore = useLocaleStore()

    function sync() {
        const cookieLocale = readRawCookie(LOCALE_COOKIE)
        if ((cookieLocale === 'en' || cookieLocale === 'uk') && cookieLocale !== localeStore.locale) {
            localeStore.applyExternalLocale(cookieLocale)
        }

        const cookieTheme = readRawCookie(THEME_COOKIE)
        if (cookieTheme) {
            const resolved = fromCookieValue(cookieTheme)
            if (
                (resolved === 'auto' || resolved === 'light' || resolved === 'dark')
                && resolved !== mode.store.value
            ) {
                mode.value = resolved
            }
        }
    }

    function onVisibilityChange() {
        if (document.visibilityState === 'visible') {
            sync()
        }
    }

    onMounted(() => {
        document.addEventListener('visibilitychange', onVisibilityChange)
        window.addEventListener('focus', sync)
    })

    onUnmounted(() => {
        document.removeEventListener('visibilitychange', onVisibilityChange)
        window.removeEventListener('focus', sync)
    })
}
