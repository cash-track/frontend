<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Passkey } from '@/api/models/passkey'
import { deletePasskey } from '@/api/profile/passkeys'
import ConfirmModal from '@/components/Shared/ConfirmModal.vue'

const props = defineProps<{
    passkey: Passkey
}>()

const emit = defineEmits<{
    deleted: []
}>()

const { t, locale } = useI18n()

const loading = shallowRef(false)
const confirmOpen = shallowRef(false)
const deleteError = shallowRef<string | null>(null)

const createdAt = computed(() =>
    props.passkey.createdAt.toLocaleDateString(locale.value, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }),
)

const usedAt = computed(() => {
    if (!props.passkey.usedAt) {
        return t('passkeySettings.usedAtNever')
    }
    return props.passkey.usedAt.toLocaleDateString(locale.value, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
})

const deleteConfirmDescription = computed(() =>
    t('passkeySettings.deleteConfirm').replace(/\{name\}/g, props.passkey.name),
)

async function onDeleteConfirmed() {
    loading.value = true
    deleteError.value = null
    try {
        await deletePasskey(props.passkey.id)
        confirmOpen.value = false
        emit('deleted')
    } catch (error) {
        deleteError.value = error instanceof Error ? error.message : t('unknownError')
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="flex items-center justify-between py-3 border-b border-default last:border-0">
        <div class="min-w-0">
            <p class="font-medium truncate">{{ passkey.name }}</p>
            <p class="text-sm text-muted mt-0.5">
                <span>{{ t('passkeySettings.created') }}: {{ createdAt }}</span>
                <span class="mx-2">·</span>
                <span>{{ t('passkeySettings.used') }}: {{ usedAt }}</span>
            </p>
        </div>
        <div class="ml-4 flex shrink-0 items-center gap-2">
            <UTooltip v-if="deleteError" :text="deleteError" :arrow="true">
                <UIcon name="i-lucide-triangle-alert" class="text-error size-5" />
            </UTooltip>
            <UButton
                :label="t('passkeySettings.delete')"
                color="error"
                variant="ghost"
                size="sm"
                :loading="loading"
                @click="confirmOpen = true"
            />
        </div>

        <ConfirmModal
            v-model:open="confirmOpen"
            :title="t('passkeySettings.delete')"
            :description="deleteConfirmDescription"
            :loading="loading"
            @confirm="onDeleteConfirmed"
        />
    </div>
</template>
