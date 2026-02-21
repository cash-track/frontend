import Vue from 'vue'
import VueI18n from 'vue-i18n'
import axios from 'axios'
import * as en from './messages/en'

Vue.use(VueI18n);

const i18n = new VueI18n({
    locale: 'en',
    fallbackLocale: 'en',
    messages: {en: en.default},
})

export default i18n

export const locales = [
    {
        code: 'en',
        name: '🇺🇸 English',
    },
    {
        code: 'uk',
        name: '🇺🇦 Українська',
    }
]

// default language that is preloaded
const loadedLanguages = ['en']

function setI18nLanguage(lang: string) {
    i18n.locale = lang
    axios.defaults.headers.common['Accept-Language'] = lang
    document.querySelector('html')?.setAttribute('lang', lang)
    return lang
}

export function loadLanguageAsync(lang: string) {
    // If the same language
    if (i18n.locale === lang) {
        return Promise.resolve(setI18nLanguage(lang))
    }

    // If the language was already loaded
    if (loadedLanguages.includes(lang)) {
        return Promise.resolve(setI18nLanguage(lang))
    }

    // If the language hasn't been loaded yet
    return import(/* webpackChunkName: "lang-[request]" */ `@/lang/messages/${lang}.ts`).then(
        messages => {
            i18n.setLocaleMessage(lang, messages.default)
            loadedLanguages.push(lang)
            return setI18nLanguage(lang)
        }
    )
}
