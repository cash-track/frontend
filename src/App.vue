<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed, onMounted, watch } from 'vue'
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
import { webSiteLink } from '@/shared/links'

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

watch(loading, done => {
    if (!done && !isLogged.value) {
        window.location.href = webSiteLink('/')
    }
})
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
            <div class="min-h-dvh flex flex-col">
                <AppHeader />

                <UContainer class="flex-1 pb-1">
                    <EmailIsNotConfirmedAlert />

                    <RouterView />
                </UContainer>

                <AppFooter />
            </div>
        </template>

        <template v-else>
            <div class="animate-pulse p-4">
                <div class="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                <div class="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
        </template>
    </UApp>
</template>
