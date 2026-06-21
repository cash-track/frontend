<script setup lang="ts">
import { ref, shallowRef, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDate, CalendarDateTime } from '@internationalized/date'
import { updateCharge } from '@/api/charges'
import type { Charge } from '@/api/models/charge'
import type { Wallet, WalletShort } from '@/api/models/wallet'
import type { Tag } from '@/api/models/tag'
import { useApiErrors } from '@/composables/useApiErrors'
import { useAuthStore } from '@/stores/auth'
import ChargeTitleFormInput from './ChargeTitleFormInput.vue'
import TagFormInput from '@/components/tags/TagFormInput.vue'
import TagChip from '@/components/tags/Tag.vue'

const props = defineProps<{
    wallet: Wallet | WalletShort
    charge: Charge
    walletTags?: Tag[]
}>()

const emit = defineEmits<{
    updated: [charge: Charge]
    cancelled: []
}>()

const { t } = useI18n()
const { fieldErrors, generalError, reset: resetErrors, handleError } = useApiErrors()
const authStore = useAuthStore()

const loading = ref(false)
const operation = ref<'+' | '-'>(props.charge.operation)
const amount = ref<number | null>(props.charge.amount)
const title = ref(props.charge.title)
const selectedTags = ref<Tag[]>([...props.charge.tags])
const description = ref(props.charge.description ?? '')
const showDescription = ref(!!props.charge.description)
const showDateTime = ref(false)
const formDateTime = shallowRef<CalendarDateTime | null>(null)

onMounted(() => {
    const d = props.charge.dateTime
    formDateTime.value = new CalendarDateTime(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes())
})

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
        const charge = await updateCharge(props.wallet.id, props.charge.id, {
            type: operation.value,
            amount: Number(amount.value),
            title: title.value,
            description: showDescription.value ? description.value || null : null,
            tags: tagIds.length > 0 ? tagIds : null,
            dateTime: buildDateTime(),
        })
        emit('updated', charge)
    } catch (err) {
        handleError(err)
    } finally {
        loading.value = false
    }
}

const isExpense = computed(() => operation.value === '-')
const isIncome = computed(() => operation.value === '+')

const maxDate = computed(() => {
    const d = new Date()
    return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
})

const formDate = computed<CalendarDate | null>({
    get: () => {
        const dt = formDateTime.value
        return dt ? new CalendarDate(dt.year, dt.month, dt.day) : null
    },
    set: (val) => {
        if (!val) { formDateTime.value = null; return }
        const dt = formDateTime.value
        formDateTime.value = new CalendarDateTime(val.year, val.month, val.day, dt?.hour ?? 0, dt?.minute ?? 0)
    },
})

</script>

<template>
    <form @submit.prevent="onSubmit" class="space-y-4 py-2">
        <!-- Operation toggle + Amount -->
        <div class="flex flex-col sm:flex-row gap-3">
            <div class="flex items-start gap-0 sm:w-2/5">
                <UButton
                    icon="i-lucide-arrow-down"
                    :variant="isExpense ? 'solid' : 'outline'"
                    color="error"
                    size="lg"
                    :disabled="loading"
                    class="rounded-r-none"
                    :aria-label="t('charges.expense')"
                    :aria-pressed="isExpense"
                    @click="operation = '-'"
                />
                <UButton
                    icon="i-lucide-arrow-up"
                    :variant="isIncome ? 'solid' : 'outline'"
                    color="success"
                    size="lg"
                    :disabled="loading"
                    class="rounded-none border-l-0"
                    :aria-label="t('charges.income')"
                    :aria-pressed="isIncome"
                    @click="operation = '+'"
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

            <UFormField class="sm:w-3/5" :error="fieldErrors.title?.[0]">
                <ChargeTitleFormInput
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
                :wallet-id="wallet.id"
                :tags="selectedTags"
                :initial-tags="walletTags"
                :disabled="loading"
                @selected="onTagSelected"
            />
        </UFormField>

        <!-- Description -->
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

        <!-- DateTime -->
        <div v-if="!showDateTime && !fieldErrors.dateTime">
            <button type="button" class="text-sm text-primary hover:underline cursor-pointer" @click="showDateTime = true">
                {{ t('charges.changeDate') }}
            </button>
        </div>
        <div v-if="showDateTime || fieldErrors.dateTime" class="flex flex-col sm:flex-row gap-3">
            <UFormField class="w-full sm:w-3/5" :error="fieldErrors.dateTime?.[0]">
                <UInputDate
                    v-model="formDate"
                    granularity="day"
                    :max-value="maxDate"
                    :disabled="loading"
                    size="lg"
                    class="w-full"
                >
                    <template #leading>
                        <UPopover>
                            <UButton
                                color="neutral"
                                variant="link"
                                size="sm"
                                icon="i-lucide-calendar"
                                class="px-0"
                            />
                            <template #content>
                                <UCalendar v-model="formDate" :max-value="maxDate" class="p-2" />
                            </template>
                        </UPopover>
                    </template>
                </UInputDate>
            </UFormField>
            <UFormField class="w-full sm:w-2/5">
                <UInputTime
                    v-model="formDateTime"
                    :hour-cycle="24"
                    :disabled="loading"
                    size="lg"
                    class="w-full"
                    icon="i-lucide-clock"
                />
            </UFormField>
        </div>

        <!-- Error -->
        <UAlert
            v-if="generalError"
            color="error"
            :description="generalError"
            icon="i-lucide-alert-circle"
        />

        <!-- Actions -->
        <div class="flex gap-2">
            <UTooltip :text="t('emailConfirmRequired')" :arrow="true" :disabled="authStore.isEmailConfirmed">
                <span class="inline-flex">
                    <UButton
                        type="submit"
                        color="primary"
                        :loading="loading"
                        :disabled="!authStore.isEmailConfirmed || loading"
                    >
                        {{ t('charges.update') }}
                    </UButton>
                </span>
            </UTooltip>
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
