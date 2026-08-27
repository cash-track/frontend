<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { describeError } from '@/shared/errors'
import { statusPageLink } from '@/shared/links'

const props = withDefaults(defineProps<{ title: string; error: unknown; retryable?: boolean }>(), {
    retryable: false,
})
const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()
const showDetails = ref(false)
const details = computed(() => describeError(props.error))

function onRetry() {
    showDetails.value = false
    emit('retry')
}

const actions = computed(() => {
    const list = []
    if (props.retryable) {
        list.push({ label: t('common.retry'), color: 'error' as const, variant: 'solid' as const, onClick: onRetry })
    }
    list.push({
        label: showDetails.value ? t('common.hideDetails') : t('common.showDetails'),
        color: 'error' as const,
        variant: 'outline' as const,
        onClick: () => { showDetails.value = !showDetails.value },
    })
    return list
})

defineExpose({ showDetails })
</script>

<template>
    <UAlert
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="title"
        :actions="actions"
    >
        <template #description>
            <pre
                v-if="showDetails"
                class="p-3 rounded-md bg-elevated text-xs whitespace-pre-wrap break-words text-muted"
            >{{ details }}</pre>
            <p :class="{ 'mt-2': showDetails }">
                {{ t('statusPageHint') }}
                <ULink
                    :href="statusPageLink()"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary-500 hover:text-primary-700 transition-colors"
                >{{ t('statusPageHintLink') }}</ULink>
            </p>
        </template>
    </UAlert>
</template>
