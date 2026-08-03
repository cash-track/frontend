<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { createLimit, updateLimit } from '@/api/limits'
import type { Limit } from '@/api/models/limit'
import type { Wallet } from '@/api/models/wallet'
import type { Tag } from '@/api/models/tag'
import { useApiErrors } from '@/composables/useApiErrors'
import TagFormInput from '@/components/tags/TagFormInput.vue'
import TagChip from '@/components/tags/Tag.vue'
import LoadErrorAlert from '@/components/Shared/LoadErrorAlert.vue'

interface TagGroup {
    connection: 'and' | 'or'
    tags: Tag[]
}

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
    'tagGroups',
    'amount',
    'type',
])

const tagInputRef = ref<InstanceType<typeof TagFormInput> | null>(null)
const loading = ref(false)
const operation = ref<'+' | '-'>('-')
const amount = ref<number | null>(null)
// Tags selected for this limit, grouped by how they combine: tags within a group are ANDed
// together, groups are ORed together. A group is 'and' iff it grew past one tag via an
// AND-toggled pick; a lone tag (or the initial state) is always 'or'.
const groups = ref<TagGroup[]>([])
const nextConnection = ref<'and' | 'or'>('or')

const selectedTags = computed(() => groups.value.flatMap(group => group.tags))

const nextConnectionLabel = computed(() =>
    nextConnection.value === 'and' ? t('limits.connectionAnd') : t('limits.connectionOr'),
)

function loadFromEdit() {
    if (props.edit) {
        operation.value = props.edit.operation
        amount.value = props.edit.amount
        groups.value = props.edit.tagGroups.map(group => ({
            connection: group.connection,
            tags: [...group.tags],
        }))
    }
}

onMounted(() => loadFromEdit())

function onTagSelected(tag: Tag) {
    if (selectedTags.value.some(t => t.id === tag.id)) return

    if (nextConnection.value === 'and' && groups.value.length > 0) {
        const lastIndex = groups.value.length - 1
        groups.value = groups.value.map((group, index) =>
            index === lastIndex
                ? { connection: 'and' as const, tags: [...group.tags, tag] }
                : group,
        )
    } else {
        groups.value = [...groups.value, { connection: 'or' as const, tags: [tag] }]
    }
}

function onTagRemoved(tag: Tag) {
    groups.value = groups.value
        .map(group => {
            const tags = group.tags.filter(t => t.id !== tag.id)
            return { connection: tags.length >= 2 ? group.connection : ('or' as const), tags }
        })
        .filter(group => group.tags.length > 0)
}

function toggleConnection() {
    nextConnection.value = nextConnection.value === 'and' ? 'or' : 'and'
}

async function onSubmit() {
    resetErrors()
    loading.value = true

    const request = {
        type: operation.value,
        amount: Number(amount.value),
        tagGroups: groups.value.map(group => ({
            operation: group.connection,
            tags: group.tags.map(t => t.id),
        })),
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
    groups.value = []
    nextConnection.value = 'or'
    tagInputRef.value?.reset()
}

function onCancel() {
    resetForm()
    emit('cancelled')
}
</script>

<template>
    <form @submit.prevent="onSubmit" class="space-y-3">
        <!-- Selected tags, grouped: tags within a group sit close together, a "+" label
             (with extra spacing) separates distinct groups -->
        <div v-if="groups.length > 0" class="flex flex-wrap items-center gap-1">
            <template v-for="(group, groupIndex) in groups" :key="groupIndex">
                <span v-if="groupIndex > 0" class="mx-2 text-xs text-muted select-none">+</span>
                <TagChip
                    v-for="tag in group.tags"
                    :key="tag.id"
                    :tag="tag"
                    removable
                    @click="onTagRemoved(tag)"
                />
            </template>
        </div>

        <!-- Tag search + Operation toggle + Amount -->
        <!-- Mobile: stacked, full width (Type+Amount on top, Tag below). Desktop: one row,
             Tag left (3/5) + Type+Amount right (2/5). flex order swaps the visual order. -->
        <div class="flex flex-col sm:flex-row gap-2">
            <UFormField class="w-full sm:w-3/5 order-2 sm:order-1" :error="fieldErrors.tagGroups?.[0]">
                <UFieldGroup size="lg" class="w-full">
                    <TagFormInput
                        ref="tagInputRef"
                        class="flex-1"
                        :wallet-id="wallet.id"
                        :tags="selectedTags"
                        :disabled="loading"
                        @selected="onTagSelected"
                    />
                    <UTooltip :text="t('limits.connectionToggleTooltip')" :arrow="true">
                        <UButton
                            :label="nextConnectionLabel"
                            :color="nextConnection === 'and' ? 'primary' : 'neutral'"
                            variant="soft"
                            :disabled="loading"
                            @click="toggleConnection"
                        />
                    </UTooltip>
                </UFieldGroup>
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
                :loading="loading"
            >
                {{ edit ? t('limits.update') : t('limits.create') }}
            </UButton>
            <UButton
                variant="outline"
                color="neutral"
                :disabled="loading"
                @click="onCancel"
            >
                {{ t('limits.cancel') }}
            </UButton>
        </div>
    </form>
</template>
