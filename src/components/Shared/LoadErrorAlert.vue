<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { describeError } from '@/shared/errors'

const props = defineProps<{ title: string; error: unknown }>()
const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()
const showDetails = ref(false)
const details = computed(() => describeError(props.error))

function onRetry() {
    showDetails.value = false
    emit('retry')
}

defineExpose({ showDetails })
</script>

<template>
    <UAlert
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="title"
        :actions="[
            { label: t('common.retry'), color: 'error', variant: 'solid', onClick: onRetry },
            { label: showDetails ? t('common.hideDetails') : t('common.showDetails'), color: 'error', variant: 'outline', onClick: () => (showDetails = !showDetails) },
        ]"
    >
        <template v-if="showDetails" #description>
            <pre
                class="p-3 rounded-md bg-elevated text-xs whitespace-pre-wrap break-words text-muted"
            >{{ details }}</pre>
        </template>
    </UAlert>
</template>
