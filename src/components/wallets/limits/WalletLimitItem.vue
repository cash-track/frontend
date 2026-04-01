<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { deleteLimit } from '@/api/limits'
import type { WalletLimit } from '@/api/models/limit'
import type { Limit } from '@/api/models/limit'
import type { Wallet } from '@/api/models/wallet'
import { useMoneyFormatter } from '@/composables/useMoneyFormatter'
import Tag from '@/components/tags/Tag.vue'
import LimitForm from './LimitForm.vue'

const props = defineProps<{
    walletLimit: WalletLimit
    wallet: Wallet
}>()

const emit = defineEmits<{
    updated: [limit: Limit]
    deleted: [limit: Limit]
}>()

const { t } = useI18n()
const { format } = useMoneyFormatter()

const isEditing = ref(false)
const deleteConfirmOpen = ref(false)
const deleting = ref(false)

const isIncome = computed(() => props.walletLimit.limit.operation === '+')
const isExpense = computed(() => props.walletLimit.limit.operation === '-')
const isExceeded = computed(() => props.walletLimit.isExceeded)
const barPercent = computed(() => Math.min(props.walletLimit.percentage, 100))
const displayPercent = computed(() => props.walletLimit.percentage.toFixed(0))
const showBarLabel = computed(() => props.walletLimit.percentage > 10)

function formatAmount(value: number): string {
    if (!props.wallet.defaultCurrency) return String(value)
    return format(value, props.wallet.defaultCurrency)
}

const menuItems = computed(() => [
    [
        { label: t('limits.edit'), icon: 'i-lucide-pencil', onSelect: () => { isEditing.value = true } },
    ],
    [
        { label: t('limits.delete'), icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => { deleteConfirmOpen.value = true } },
    ],
])

async function onDeleteConfirmed() {
    deleting.value = true
    try {
        await deleteLimit(props.wallet.id, props.walletLimit.limit.id)
        deleteConfirmOpen.value = false
        emit('deleted', props.walletLimit.limit)
    } catch (err) {
        console.error('unable to delete limit', err)
    } finally {
        deleting.value = false
    }
}

function onUpdated(limit: Limit) {
    isEditing.value = false
    emit('updated', limit)
}

function onEditCancelled() {
    isEditing.value = false
}
</script>

<template>
    <div class="py-2">
        <!-- Header: tags + amount -->
        <div class="flex flex-wrap items-end justify-between gap-2 mb-1">
            <div class="flex flex-wrap items-center gap-1">
                <UIcon
                    v-if="isIncome"
                    name="i-lucide-arrow-up"
                    class="text-primary hidden sm:inline-block"
                />
                <UIcon
                    v-if="isExpense"
                    name="i-lucide-arrow-down"
                    class="text-red-500 hidden sm:inline-block"
                />
                <Tag
                    v-for="tag in walletLimit.limit.tags"
                    :key="tag.id"
                    :tag="tag"
                />
            </div>
            <div class="flex items-center gap-2">
                <span class="text-lg whitespace-nowrap" :class="isIncome ? 'text-primary' : 'text-red-500'">
                    <UIcon
                        :name="isIncome ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                        class="hidden sm:inline-block"
                    />
                    {{ formatAmount(walletLimit.amount) }}
                    <span class="text-sm text-muted">/ {{ formatAmount(walletLimit.limit.amount) }}</span>
                </span>
                <UDropdownMenu :items="menuItems">
                    <UButton
                        icon="i-lucide-ellipsis-vertical"
                        variant="ghost"
                        color="neutral"
                        size="xs"
                    />
                </UDropdownMenu>
            </div>
        </div>

        <!-- Progress bar -->
        <div class="relative w-full h-5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
                class="h-full rounded-full transition-all duration-300 flex items-center justify-center"
                :class="isExpense && isExceeded ? 'bg-red-500' : 'bg-gray-400'"
                :style="{ width: `${barPercent}%` }"
            >
                <span v-if="showBarLabel" class="text-xs font-bold text-white">
                    {{ displayPercent }}%
                </span>
            </div>
        </div>

        <!-- Edit form (collapsible) -->
        <div v-if="isEditing" class="mt-3 p-4 bg-elevated border border-default rounded-lg">
            <LimitForm
                :wallet="wallet"
                :edit="walletLimit.limit"
                @updated="onUpdated"
                @cancelled="onEditCancelled"
            />
        </div>

        <!-- Delete confirmation modal -->
        <UModal v-model:open="deleteConfirmOpen" :title="t('limits.delete')">
            <template #body>
                <p class="text-sm text-muted">{{ t('limits.deletingConfirm') }}</p>
            </template>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <UButton
                        variant="ghost"
                        :label="t('limits.cancel')"
                        :disabled="deleting"
                        @click="deleteConfirmOpen = false"
                    />
                    <UButton
                        color="error"
                        :label="t('limits.delete')"
                        :loading="deleting"
                        @click="onDeleteConfirmed"
                    />
                </div>
            </template>
        </UModal>
    </div>
</template>
