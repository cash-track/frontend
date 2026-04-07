<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PasskeysSettings from './PasskeysSettings.vue'

const { t } = useI18n()
</script>

<template>
    <UCard>
        <template #header>
            <div class="flex items-center gap-2">
                <UIcon name="i-lucide-shield-check" class="size-5" />
                <h2 class="font-semibold text-lg">{{ t('passkeySettings.passkeys') }}</h2>
            </div>
        </template>

        <PasskeysSettings />
    </UCard>
</template>
