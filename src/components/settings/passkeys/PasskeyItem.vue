<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Passkey } from '@/api/models/passkey'
import { deletePasskey } from '@/api/profile/passkeys'
import { useNotifications } from '@/composables/useNotifications'

const props = defineProps<{
    passkey: Passkey
}>()

const emit = defineEmits<{
    deleted: []
}>()

const { t } = useI18n()
const { notifyError } = useNotifications()

const loading = shallowRef(false)

const createdAt = computed(() =>
    props.passkey.createdAt.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }),
)

const usedAt = computed(() => {
    if (!props.passkey.usedAt) {
        return t('passkeySettings.usedAtNever')
    }
    return props.passkey.usedAt.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
})

async function onDelete() {
    const msg = t('passkeySettings.deleteConfirm').replace(/\{name\}/g, props.passkey.name)
    if (!window.confirm(msg)) return

    loading.value = true
    try {
        await deletePasskey(props.passkey.id)
        emit('deleted')
    } catch {
        notifyError(t('passkeySettings.delete') + ' failed')
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
        <UButton
            :label="t('passkeySettings.delete')"
            color="error"
            variant="ghost"
            size="sm"
            :loading="loading"
            class="ml-4 shrink-0"
            @click="onDelete"
        />
    </div>
</template>
