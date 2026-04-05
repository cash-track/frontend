<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n()

const navItems = computed<NavigationMenuItem[]>(() => [
    {
        label: t('personalSettings.profile'),
        to: { name: 'settings.profile' },
        icon: 'i-lucide-user',
    },
    {
        label: t('personalSettings.security'),
        to: { name: 'settings.security' },
        icon: 'i-lucide-shield',
    },
])
</script>

<template>
    <UContainer class="py-6">
        <h1 class="text-2xl font-semibold mb-6">{{ t('personalSettings.header') }}</h1>
        <div class="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
            <aside>
                <UNavigationMenu :items="navItems" orientation="vertical" class="w-full" />
            </aside>
            <main>
                <RouterView />
            </main>
        </div>
    </UContainer>
</template>
