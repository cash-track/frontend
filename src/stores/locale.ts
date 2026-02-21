import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useLocaleStore = defineStore('locale', () => {
  const locale = ref('en')

  function localeChange(newLocale: 'en' | 'uk') {
    locale.value = newLocale
  }

  return { locale, localeChange }
})
