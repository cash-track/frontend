<script setup lang="ts">
import { computed } from 'vue'
import type { Currency } from '@/api/models/currency'
import { useMoneyFormatter } from '@/composables/useMoneyFormatter'

const props = defineProps<{
    amount: number
    currency?: Currency | null
    showFraction?: boolean
}>()

const { format } = useMoneyFormatter()

const formatted = computed(() => {
    if (!props.currency) return String(props.amount)
    return format(props.amount, props.currency, props.showFraction ?? false)
})
</script>

<template>
    <span>{{ formatted }}</span>
</template>
