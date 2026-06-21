import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import * as en from './messages/en'

const i18n = createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    availableLocales: ['en', 'uk'],
    messages: {
        en: en.default,
        uk: {},
    }
})

export default i18n;

export interface LocaleInterface {
    code: 'en' | 'uk';
    name: string;
    flag: string;
}

export const locales: Array<LocaleInterface> = [
    {
        code: 'en',
        name: '🇺🇸 English',
        flag: '🇺🇸',
    },
    {
        code: 'uk',
        name: '🇺🇦 Українська',
        flag: '🇺🇦',
    }
]

// default language that is preloaded
const loadedLanguages = ['en']

function setI18nLanguage(lang: 'en' | 'uk') {
    i18n.global.locale.value = lang
    // axios.defaults.headers.common['Accept-Language'] = lang
    document.querySelector('html')?.setAttribute('lang', lang)
    return lang
}

export async function loadLocaleAsync(locale: string) {
    if (locale !== 'uk' && locale !== 'en') {
        return Promise.reject(new Error(`Unsupported locale: ${locale}`))
    }

    // If the same language
    if (i18n.global.locale.value === locale) {
        return Promise.resolve(setI18nLanguage(locale))
    }

    // If the language was already loaded
    if (loadedLanguages.includes(locale)) {
        return Promise.resolve(setI18nLanguage(locale))
    }

    // load locale messages with dynamic import
    const messages = await import(
        /* webpackChunkName: "locale-[request]" */ `@/lang/messages/${locale}.ts`
        )

    // set locale and locale message
    i18n.global.setLocaleMessage(locale, messages.default)
    loadedLanguages.push(locale)
    setI18nLanguage(locale)

    return nextTick()
}
