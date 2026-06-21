<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChargesFlowPeriod } from '@/api/profile'
import type { Currency } from '@/api/models/currency'
import MoneyAmount from '@/components/Shared/MoneyAmount.vue'

const props = defineProps<{
    type: '+' | '-'
    stats: ChargesFlowPeriod
    currency: Currency | null
}>()

const { t } = useI18n()

const isIncome = computed(() => props.type === '+')

const rows = computed(() => [
    { label: t('profile.allTime'), value: props.stats.total },
    { label: t('profile.year'), value: props.stats.lastYear },
    { label: t('profile.quarter'), value: props.stats.lastQuarter },
    { label: t('profile.month'), value: props.stats.lastMonth },
])
</script>

<template>
    <UCard :ui="{ ring: isIncome ? 'ring-success/30' : 'ring-error/30' }" class="mb-4">
        <template #header>
            <div class="flex items-center justify-between">
                <span class="font-semibold">
                    {{ isIncome ? t('profile.income') : t('profile.expense') }}
                </span>
                <UIcon
                    :name="isIncome ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                    :class="isIncome ? 'text-success' : 'text-error'"
                    class="size-4"
                />
            </div>
        </template>
        <div class="divide-y divide-default">
            <div
                v-for="row in rows"
                :key="row.label"
                class="flex justify-between items-center py-2 text-sm"
            >
                <span class="text-muted">{{ row.label }}</span>
                <MoneyAmount class="font-semibold" :class="isIncome ? 'text-success' : 'text-error'" :amount="row.value" :currency="currency" />
            </div>
        </div>
    </UCard>
</template>
