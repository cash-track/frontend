<script setup lang="ts">
import { ref, shallowRef, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDateTime } from '@internationalized/date'
import { createCharge } from '@/api/charges'
import type { Charge } from '@/api/models/charge'
import type { Wallet } from '@/api/models/wallet'
import type { Tag } from '@/api/models/tag'
import { useApiErrors } from '@/composables/useApiErrors'
import { useAuthStore } from '@/stores/auth'
import ChargeTitleFormInput from './ChargeTitleFormInput.vue'
import TagFormInput from '@/components/tags/TagFormInput.vue'
import TagChip from '@/components/tags/Tag.vue'
import DateTimePicker from '@/components/DateTimePicker.vue'

const props = defineProps<{
    wallet: Wallet
    walletTags?: Tag[]
}>()

const emit = defineEmits<{
    'charge-created': [charge: Charge]
    cancelled: []
}>()

const { t } = useI18n()
const { fieldErrors, generalError, reset: resetErrors, handleError } = useApiErrors()
const authStore = useAuthStore()

const titleInputRef = ref<InstanceType<typeof ChargeTitleFormInput> | null>(null)
const tagInputRef = ref<InstanceType<typeof TagFormInput> | null>(null)

const loading = ref(false)
const operation = ref<'+' | '-'>('-')
const amount = ref<number | null>(null)
const title = ref('')
const selectedTags = ref<Tag[]>([])
const description = ref('')
const showDescription = ref(false)
const showDateTime = ref(false)
const formDateTime = shallowRef<CalendarDateTime | null>(null)

const isIncome = computed(() => operation.value === '+')
const isExpense = computed(() => operation.value === '-')

function setExpense() { operation.value = '-' }
function setIncome() { operation.value = '+' }

function onTagSelected(tag: Tag) {
    if (selectedTags.value.some(t => t.id === tag.id)) return
    selectedTags.value = [tag, ...selectedTags.value]
}

function onTagRemoved(tag: Tag) {
    selectedTags.value = selectedTags.value.filter(t => t.id !== tag.id)
}

function buildDateTime(): string | null {
    if (!showDateTime.value || !formDateTime.value) return null
    const dt = formDateTime.value
    const local = new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute)
    const y = local.getUTCFullYear()
    const m = String(local.getUTCMonth() + 1).padStart(2, '0')
    const d = String(local.getUTCDate()).padStart(2, '0')
    const h = String(local.getUTCHours()).padStart(2, '0')
    const min = String(local.getUTCMinutes()).padStart(2, '0')
    const s = String(local.getUTCSeconds()).padStart(2, '0')
    return `${y}-${m}-${d} ${h}:${min}:${s}`
}

async function onSubmit() {
    resetErrors()
    loading.value = true

    try {
        const tagIds = selectedTags.value.map(t => t.id)
        const charge = await createCharge(props.wallet.id, {
            type: operation.value,
            amount: Number(amount.value),
            title: title.value,
            description: showDescription.value ? description.value || null : null,
            tags: tagIds.length > 0 ? tagIds : null,
            dateTime: buildDateTime(),
        })

        emit('charge-created', charge)
        resetForm()
    } catch (err) {
        handleError(err)
    } finally {
        loading.value = false
    }
}

function resetForm() {
    operation.value = '-'
    amount.value = null
    title.value = ''
    selectedTags.value = []
    description.value = ''
    showDescription.value = false
    showDateTime.value = false
    formDateTime.value = null
    titleInputRef.value?.reset()
    tagInputRef.value?.reset()
}

const maxDateTime = computed(() => {
    const d = new Date()
    return new CalendarDateTime(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes())
})
</script>

<template>
    <form @submit.prevent="onSubmit" class="space-y-4">
        <!-- Operation toggle + Amount -->
        <div class="flex flex-col sm:flex-row gap-3">
            <div class="flex items-start gap-0 sm:w-2/5">
                <UButton
                    icon="i-lucide-arrow-down"
                    :variant="isExpense ? 'solid' : 'outline'"
                    color="error"
                    :disabled="loading"
                    class="rounded-r-none"
                    size="lg"
                    @click="setExpense"
                />
                <UButton
                    icon="i-lucide-arrow-up"
                    :variant="isIncome ? 'solid' : 'outline'"
                    color="success"
                    :disabled="loading"
                    class="rounded-none border-l-0"
                    size="lg"
                    @click="setIncome"
                />
                <UFormField class="flex-1" :error="fieldErrors.amount?.[0] || fieldErrors.type?.[0]">
                    <UInput
                        v-model="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        :placeholder="t('charges.amount')"
                        :disabled="loading"
                        class="w-full"
                        size="lg"
                        :ui="{ root: '-ml-[2px] focus-within:z-[1]', base: 'rounded-l-none' }"
                    />
                </UFormField>
            </div>

            <!-- Title -->
            <UFormField class="sm:w-3/5" :error="fieldErrors.title?.[0]">
                <ChargeTitleFormInput
                    ref="titleInputRef"
                    v-model="title"
                    :tags="selectedTags"
                    :wallet-id="wallet.id"
                    :disabled="loading"
                    @tag-selected="onTagSelected"
                />
            </UFormField>
        </div>

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

        <!-- Tag search -->
        <UFormField :error="fieldErrors.tags?.[0]">
            <TagFormInput
                ref="tagInputRef"
                :wallet-id="wallet.id"
                :tags="selectedTags"
                :initial-tags="walletTags"
                :disabled="loading"
                @selected="onTagSelected"
            />
        </UFormField>

        <!-- Optional: description -->
        <div v-if="!showDescription && !fieldErrors.description">
            <button type="button" class="text-sm text-primary hover:underline cursor-pointer" @click="showDescription = true">
                {{ t('charges.changeDescription') }}
            </button>
        </div>
        <UFormField v-if="showDescription || fieldErrors.description" :error="fieldErrors.description?.[0]">
            <UTextarea
                v-model="description"
                :placeholder="t('charges.description')"
                :disabled="loading"
                class="w-full"
            />
        </UFormField>

        <!-- Optional: dateTime -->
        <div v-if="!showDateTime && !fieldErrors.dateTime">
            <button type="button" class="text-sm text-primary hover:underline cursor-pointer" @click="showDateTime = true">
                {{ t('charges.changeDate') }}
            </button>
        </div>
        <UFormField v-if="showDateTime || fieldErrors.dateTime" :error="fieldErrors.dateTime?.[0]">
            <UInputDate
                v-model="formDateTime"
                granularity="minute"
                :max-value="maxDateTime"
                :disabled="loading"
            >
                <template #trailing>
                    <UPopover>
                        <UButton
                            color="neutral"
                            variant="link"
                            size="sm"
                            icon="i-lucide-calendar"
                            class="px-0"
                        />
                        <template #content>
                            <DateTimePicker v-model="formDateTime" :max-value="maxDateTime" />
                        </template>
                    </UPopover>
                </template>
            </UInputDate>
        </UFormField>

        <!-- Error message -->
        <UAlert
            v-if="generalError"
            color="error"
            :description="generalError"
            icon="i-lucide-alert-circle"
        />

        <!-- Submit -->
        <div class="flex gap-2">
            <UButton
                type="submit"
                color="primary"
                :loading="loading"
                :disabled="!authStore.isEmailConfirmed || loading"
            >
                {{ t('charges.create') }}
            </UButton>
            <UButton
                variant="outline"
                color="neutral"
                :disabled="loading"
                @click="emit('cancelled')"
            >
                {{ t('charges.cancel') }}
            </UButton>
        </div>
    </form>
</template>
