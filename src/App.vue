<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import * as locales from '@nuxt/ui/locale'

import Header from '@/components/Header.vue'

const { locale } = useI18n()

const lang = computed(() => locales[locale.value].code)

useHead({
    htmlAttrs: {
        lang,
    }
})
</script>

<template>
    <UApp :locale="locales[locale]">
        <Header />

        <UContainer class="pb-1">
            <RouterView />
        </UContainer>


    </UApp>
</template>

<style lang="scss">

</style>
