<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePWAUpdate } from '@/pwa'

const { t } = useI18n()
const { needRefresh, updateApp } = usePWAUpdate()

const reloading = ref(false)

async function onReload() {
    reloading.value = true
    await updateApp()
}
</script>

<template>
    <div
        v-if="needRefresh"
        class="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
    >
        <div
            class="flex w-full max-w-md items-center justify-between gap-3 rounded-lg border border-default bg-elevated px-4 py-3 shadow-lg"
        >
            <p class="text-sm text-default">{{ t('pwa.newVersion') }}</p>
            <UButton
                :label="t('pwa.reload')"
                color="primary"
                size="sm"
                :loading="reloading"
                :disabled="reloading"
                @click="onReload"
            />
        </div>
    </div>
</template>
