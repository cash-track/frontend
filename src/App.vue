<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import * as locales from '@nuxt/ui/locale'

import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useProfileStore } from '@/stores/profile'
import { useAuthStore } from '@/stores/auth'
import { useLocaleStore, syncLocaleWithI18n } from '@/stores/locale'
import { resendEmailConfirmation } from '@/api/profile/email'
import { useNotifications } from '@/composables/useNotifications'

const { t } = useI18n()
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
const { isLogged, isEmailConfirmed } = storeToRefs(authStore)

const { notifySuccess, notifyError } = useNotifications()

onMounted(() => profileStore.loadProfile())

async function onResendConfirmation() {
    try {
        await resendEmailConfirmation()
        notifySuccess(t('emailFormInput.confirmationMessage'))
    } catch {
        notifyError(t('unknownError'))
    }
}
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
                <UAlert
                    v-if="!isEmailConfirmed"
                    color="warning"
                    variant="soft"
                    icon="i-lucide-triangle-alert"
                    :title="t('profile.emailNotConfirmed')"
                    :description="t('profile.emailNotConfirmedMainMessage')"
                    :actions="[{
                        label: t('emailFormInput.resend'),
                        color: 'warning',
                        variant: 'subtle',
                        onClick: onResendConfirmation,
                    }]"
                    class="mb-4"
                />

                <RouterView />
            </UContainer>

            <AppFooter />
        </template>
    </UApp>
</template>

<style lang="scss">

</style>
