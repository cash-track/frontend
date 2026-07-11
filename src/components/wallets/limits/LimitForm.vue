<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { createLimit, updateLimit } from '@/api/limits'
import type { Limit } from '@/api/models/limit'
import type { Wallet } from '@/api/models/wallet'
import type { Tag } from '@/api/models/tag'
import { useApiErrors } from '@/composables/useApiErrors'
import TagFormInput from '@/components/tags/TagFormInput.vue'
import TagChip from '@/components/tags/Tag.vue'
import LoadErrorAlert from '@/components/Shared/LoadErrorAlert.vue'

const props = defineProps<{
    wallet: Wallet
    edit?: Limit
}>()

const emit = defineEmits<{
    created: [limit: Limit]
    updated: [limit: Limit]
    cancelled: []
}>()

const { t } = useI18n()
const { fieldErrors, generalError, generalErrorRaw, reset: resetErrors, handleError } = useApiErrors([
    'tags',
    'amount',
    'type',
])

const tagInputRef = ref<InstanceType<typeof TagFormInput> | null>(null)
const loading = ref(false)
const operation = ref<'+' | '-'>('-')
const amount = ref<number | null>(null)
const selectedTags = ref<Tag[]>([])

function loadFromEdit() {
    if (props.edit) {
        operation.value = props.edit.operation
        amount.value = props.edit.amount
        selectedTags.value = [...props.edit.tags]
    }
}

onMounted(() => loadFromEdit())

function onTagSelected(tag: Tag) {
    if (selectedTags.value.some(t => t.id === tag.id)) return
    selectedTags.value = [tag, ...selectedTags.value]
}

function onTagRemoved(tag: Tag) {
    selectedTags.value = selectedTags.value.filter(t => t.id !== tag.id)
}

async function onSubmit() {
    resetErrors()
    loading.value = true

    const request = {
        type: operation.value,
        amount: Number(amount.value),
        tags: selectedTags.value.map(t => t.id),
    }

    try {
        if (props.edit) {
            const limit = await updateLimit(props.wallet.id, props.edit.id, request)
            emit('updated', limit)
        } else {
            const limit = await createLimit(props.wallet.id, request)
            emit('created', limit)
            resetForm()
        }
    } catch (err) {
        handleError(err)
    } finally {
        loading.value = false
    }
}

function resetForm() {
    operation.value = '-'
    amount.value = null
    selectedTags.value = []
    tagInputRef.value?.reset()
}

function onCancel() {
    resetForm()
    emit('cancelled')
}
</script>

<template>
    <form @submit.prevent="onSubmit" class="space-y-3">
        <!-- Selected tags -->
        <div v-if="selectedTags.length > 0" class="flex flex-wrap gap-1">
            <TagChip
                v-for="tag in selectedTags"
                :key="tag.id"
                :tag="tag"
                removable
                @click="onTagRemoved(tag)"
            />
        </div>

        <!-- Tag search + Operation toggle + Amount -->
        <!-- Mobile: stacked, full width (Type+Amount on top, Tag below). Desktop: one row,
             Tag left (3/5) + Type+Amount right (2/5). flex order swaps the visual order. -->
        <div class="flex flex-col sm:flex-row gap-2">
            <UFormField class="w-full sm:w-3/5 order-2 sm:order-1" :error="fieldErrors.tags?.[0]">
                <TagFormInput
                    ref="tagInputRef"
                    :wallet-id="wallet.id"
                    :tags="selectedTags"
                    :disabled="loading"
                    @selected="onTagSelected"
                />
            </UFormField>

            <div class="flex items-start gap-0 w-full sm:w-2/5 order-1 sm:order-2">
                <UButton
                    icon="i-lucide-arrow-down"
                    :variant="operation === '-' ? 'solid' : 'outline'"
                    color="error"
                    :disabled="loading"
                    class="rounded-r-none"
                    size="lg"
                    @click="operation = '-'"
                />
                <UButton
                    icon="i-lucide-arrow-up"
                    :variant="operation === '+' ? 'solid' : 'outline'"
                    color="success"
                    :disabled="loading"
                    class="rounded-none border-l-0"
                    size="lg"
                    @click="operation = '+'"
                />
                <UFormField class="flex-1" :error="fieldErrors.amount?.[0] || fieldErrors.type?.[0]">
                    <UInput
                        v-model="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        :placeholder="t('limits.amount')"
                        :disabled="loading"
                        class="w-full"
                        size="lg"
                        :ui="{ root: '-ml-[2px] focus-within:z-[1]', base: 'rounded-l-none' }"
                    />
                </UFormField>
            </div>
        </div>

        <!-- Error message -->
        <LoadErrorAlert v-if="generalErrorRaw" :title="generalError ?? t('unknownError')" :error="generalErrorRaw" />
        <UAlert
            v-else-if="generalError"
            color="error"
            :description="generalError"
            icon="i-lucide-alert-circle"
        />

        <!-- Actions -->
        <div class="flex gap-2">
            <UButton
                type="submit"
                color="primary"
                size="lg"
                :loading="loading"
            >
                {{ edit ? t('limits.update') : t('limits.create') }}
            </UButton>
            <UButton
                variant="outline"
                color="neutral"
                size="lg"
                :disabled="loading"
                @click="onCancel"
            >
                {{ t('limits.cancel') }}
            </UButton>
        </div>
    </form>
</template>
