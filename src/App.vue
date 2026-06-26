<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import * as locales from '@nuxt/ui/locale'

import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import EmailIsNotConfirmedAlert from '@/components/profile/EmailIsNotConfirmedAlert.vue'
import LoadErrorAlert from '@/components/Shared/LoadErrorAlert.vue'
import { useProfileStore } from '@/stores/profile'
import { useAuthStore } from '@/stores/auth'
import { useLocaleStore, syncLocaleWithI18n } from '@/stores/locale'
import { setDocumentTitle } from '@/router'

const { t, locale } = useI18n()
const router = useRouter()

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
const { loading, failed, lastError } = storeToRefs(profileStore)
const { isLogged } = storeToRefs(authStore)

onMounted(() => profileStore.loadProfile())

watch(locale, () => setDocumentTitle(router.currentRoute.value))
</script>

<template>
    <UApp :locale="locales[locale as unknown as keyof typeof locales]">
        <div class="min-h-dvh flex flex-col">
            <AppHeader />

            <UContainer class="flex-1 pb-1">
                <!-- Gated on isLogged so the email-not-confirmed alert can't flash during the
                     profile-load window (isEmailConfirmed defaults to false). -->
                <EmailIsNotConfirmedAlert v-if="isLogged" />

                <!-- `loading ||` mounts the route during the profile-load window so each page shows
                     its own per-section skeletons (the page-specific preloader); `|| isLogged` keeps
                     it mounted afterwards. Don't reduce to just `isLogged` — that brings back a blank
                     content area until the profile resolves. -->
                <RouterView v-if="loading || isLogged" />

                <!-- Non-401 profile load failure — show retry instead of redirecting to website. -->
                <LoadErrorAlert
                    v-else-if="failed"
                    :title="t('profile.loadError')"
                    :error="lastError"
                    @retry="profileStore.loadProfile()"
                />
            </UContainer>

            <AppFooter />
        </div>
    </UApp>
</template>
