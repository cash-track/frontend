<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
    open: boolean
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    loading?: boolean
}>(), {
    confirmLabel: undefined,
    cancelLabel: undefined,
    loading: false,
})

const emit = defineEmits<{
    'update:open': [value: boolean]
    confirm: []
}>()

const { t } = useI18n()

function cancel() {
    emit('update:open', false)
}
</script>

<template>
    <UModal :open="props.open" :title="props.title" @update:open="emit('update:open', $event)">
        <template #body>
            <div class="space-y-3">
                <slot />
                <p class="text-sm text-muted">{{ props.description }}</p>
            </div>
        </template>
        <template #footer>
            <div class="flex justify-end gap-2">
                <UButton
                    variant="ghost"
                    :label="cancelLabel ?? t('common.cancel')"
                    :disabled="loading"
                    @click="cancel"
                />
                <UButton
                    color="error"
                    :label="confirmLabel ?? t('common.delete')"
                    :loading="loading"
                    @click="emit('confirm')"
                />
            </div>
        </template>
    </UModal>
</template>
