<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Currency } from '@/api/models/currency'
import MoneyAmount from '@/components/Shared/MoneyAmount.vue'

defineOptions({ name: 'TotalsRow' })

const props = defineProps<{
    currency?: Currency | null
    incomeAmount?: number
    expenseAmount?: number
    /** When provided, renders an "Available" column first and fixes Income → Expense order. */
    totalAmount?: number
    loading?: boolean
}>()

const { t } = useI18n()

const incomeAmount = computed(() => props.incomeAmount ?? 0)
const expenseAmount = computed(() => props.expenseAmount ?? 0)
const hasAvailable = computed(() => props.totalAmount !== undefined)

// When Available is shown both items are secondary (text-lg).
// When no Available, the greater item is promoted to the Available style (text-4xl/5xl).
const items = computed(() => {
    const incomeFirst = hasAvailable.value || incomeAmount.value >= expenseAmount.value
    const income = {
        label: t('wallets.income'),
        amount: incomeAmount.value,
        color: 'text-primary' as const,
        icon: 'i-lucide-arrow-up',
        primary: !hasAvailable.value && incomeFirst,
    }
    const expense = {
        label: t('wallets.expense'),
        amount: expenseAmount.value,
        color: 'text-error' as const,
        icon: 'i-lucide-arrow-down',
        primary: !hasAvailable.value && !incomeFirst,
    }
    return incomeFirst ? [income, expense] : [expense, income]
})
</script>

<template>
    <!-- Skeleton -->
    <div v-if="loading" class="flex flex-wrap justify-center items-end gap-4 sm:gap-8 mt-6 py-4">
        <!-- Large block: Available (when shown) or the promoted primary item -->
        <div class="w-full sm:w-auto text-center sm:text-left">
            <USkeleton class="h-4 w-20 mb-1.5 rounded mx-auto sm:mx-0" />
            <USkeleton class="h-12 w-36 rounded mx-auto sm:mx-0" />
        </div>
        <!-- Secondary item -->
        <div class="text-center sm:text-left">
            <USkeleton class="h-4 w-12 mb-1.5 rounded mx-auto sm:mx-0" />
            <USkeleton class="h-6 w-24 rounded mx-auto sm:mx-0" />
        </div>
        <!-- Third item only when Available is present -->
        <div v-if="totalAmount !== undefined" class="text-center sm:text-left">
            <USkeleton class="h-4 w-14 mb-1.5 rounded mx-auto sm:mx-0" />
            <USkeleton class="h-6 w-24 rounded mx-auto sm:mx-0" />
        </div>
    </div>

    <!-- Content -->
    <div v-else-if="currency" class="flex flex-wrap justify-center items-end gap-4 sm:gap-8 mt-6 py-4">
        <div v-if="totalAmount !== undefined" class="w-full sm:w-auto text-center sm:text-left">
            <div class="text-sm text-muted">{{ t('wallets.available') }}</div>
            <div class="text-4xl sm:text-5xl font-medium text-success">
                <MoneyAmount :amount="totalAmount" :currency="currency" />
            </div>
        </div>
        <div
            v-for="item in items"
            :key="item.label"
            :class="item.primary ? 'w-full sm:w-auto text-center sm:text-left' : 'text-center sm:text-left'"
        >
            <div class="text-sm text-muted">{{ item.label }}</div>
            <div v-if="item.primary" class="text-4xl sm:text-5xl font-medium" :class="item.color">
                <MoneyAmount :amount="item.amount" :currency="currency" />
            </div>
            <div v-else class="text-lg font-medium flex items-center justify-center gap-0 sm:gap-1" :class="item.color">
                <UIcon :name="item.icon" class="size-4 hidden sm:inline" />
                <MoneyAmount :amount="item.amount" :currency="currency" />
            </div>
        </div>
    </div>
</template>
