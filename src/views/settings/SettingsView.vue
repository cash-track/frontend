<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ProfileSettingsView from '@/views/settings/ProfileSettingsView.vue'
import SecuritySettingsView from '@/views/settings/SecuritySettingsView.vue'

const { t } = useI18n()

const tabs = computed(() => [
    { label: t('personalSettings.profile'), icon: 'i-lucide-user', slot: 'profile' as const },
    { label: t('personalSettings.security'), icon: 'i-lucide-shield', slot: 'security' as const },
])
</script>

<template>
    <UContainer class="pb-6">
        <h1 class="text-2xl font-semibold mb-6">{{ t('personalSettings.header') }}</h1>
        <UTabs :items="tabs" class="mt-2">
            <template #profile>
                <ProfileSettingsView class="mt-3" />
            </template>
            <template #security>
                <SecuritySettingsView class="mt-3" />
            </template>
        </UTabs>
    </UContainer>
</template>
