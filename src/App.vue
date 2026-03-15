<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import * as locales from '@nuxt/ui/locale'

import AppHeader from '@/components/AppHeader.vue'
import { useProfileStore } from '@/stores/profile'
import { useLocaleStore, syncLocaleWithI18n } from '@/stores/locale'

const { locale } = useI18n()

const lang = computed(() => locales[locale.value as keyof typeof locales].code)

useHead({
    htmlAttrs: {
        lang,
    },
})

const localeStore = useLocaleStore()
localeStore.loadCachedLocale()
syncLocaleWithI18n()

const profileStore = useProfileStore()
onMounted(() => profileStore.loadProfile())
</script>

<template>
    <UApp :locale="locales[locale as unknown as keyof typeof locales]">
        <AppHeader />

        <UContainer class="pb-1">
            <RouterView />
        </UContainer>
    </UApp>
</template>

<style lang="scss">

</style>
