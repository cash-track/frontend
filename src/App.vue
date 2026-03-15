<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import * as locales from '@nuxt/ui/locale'

import AppHeader from '@/components/AppHeader.vue'

const { locale } = useI18n()

const lang = computed(() => locales[locale.value as keyof typeof locales].code)

useHead({
    htmlAttrs: {
        lang,
    },
})
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
