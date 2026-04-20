<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import * as locales from '@nuxt/ui/locale'

import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import EmailIsNotConfirmedAlert from '@/components/profile/EmailIsNotConfirmedAlert.vue'
import { useProfileStore } from '@/stores/profile'
import { useAuthStore } from '@/stores/auth'
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
const authStore = useAuthStore()
const { loading } = storeToRefs(profileStore)
const { isLogged } = storeToRefs(authStore)

onMounted(() => profileStore.loadProfile())
</script>

<template>
    <UApp :locale="locales[locale as unknown as keyof typeof locales]">
        <template v-if="loading">
            <div class="animate-pulse p-4">
                <div class="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                <div class="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
        </template>

        <template v-else-if="isLogged">
            <AppHeader />

            <UContainer class="pb-1">
                <EmailIsNotConfirmedAlert />

                <RouterView />
            </UContainer>

            <AppFooter />
        </template>
    </UApp>
</template>

<style lang="scss">

</style>
