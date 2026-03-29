<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bar } from 'vue-chartjs'
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
    type ChartData,
    type ChartOptions,
} from 'chart.js'
import { getChargesFlowByDate, type ChargesFlowDataPoint, type GetChargesFlowParams } from '@/api/graph'
import type { Currency } from '@/api/models/currency'
import { useMoneyFormatter } from '@/composables/useMoneyFormatter'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps<{
    walletId: number
    currency: Currency | null
}>()

const { t } = useI18n()
const { format } = useMoneyFormatter()

type GroupBy = 'date' | 'day' | 'month'

const groupBy = ref<GroupBy>('date')
const loading = ref(false)
const error = ref<string | null>(null)
const dataPoints = ref<ChargesFlowDataPoint[]>([])

const groupByOptions = computed(() => [
    { label: t('wallets.groupByDay'), value: 'date' as GroupBy },
    { label: t('wallets.groupByMonth'), value: 'month' as GroupBy },
])

const chartData = computed<ChartData<'bar'>>(() => ({
    labels: dataPoints.value.map(d => d.date),
    datasets: [
        {
            label: t('wallets.expense'),
            backgroundColor: '#dc3545',
            data: dataPoints.value.map(d => d.expense),
        },
        {
            label: t('wallets.income'),
            backgroundColor: '#28a745',
            data: dataPoints.value.map(d => d.income),
        },
    ],
}))

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        y: {
            ticks: {
                callback: (value) => {
                    if (typeof value !== 'number' || !props.currency) return value
                    return format(value, props.currency)
                },
            },
        },
    },
    plugins: {
        tooltip: {
            callbacks: {
                label: (context) => {
                    let label = context.dataset.label || ''
                    if (label) label += ': '
                    if (context.parsed.y !== null && props.currency) {
                        label += format(context.parsed.y, props.currency)
                    }
                    return label
                },
            },
        },
    },
}))

async function loadData() {
    loading.value = true
    error.value = null
    try {
        const params: GetChargesFlowParams = { groupBy: groupBy.value }
        dataPoints.value = await getChargesFlowByDate(props.walletId, params)
    } catch {
        error.value = t('wallets.chartLoadingError')
    } finally {
        loading.value = false
    }
}

watch(groupBy, () => loadData())
onMounted(() => loadData())

defineExpose({ reload: loadData })
</script>

<template>
    <div>
        <div class="flex justify-end mb-4">
            <USelect
                v-model="groupBy"
                :items="groupByOptions"
                value-key="value"
                label-key="label"
                size="sm"
                class="w-40"
            />
        </div>

        <div v-if="loading" class="flex justify-center py-8">
            <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
        </div>

        <UAlert
            v-else-if="error"
            color="error"
            :description="error"
            icon="i-lucide-alert-circle"
        />

        <div v-else class="relative h-[300px]">
            <Bar :data="chartData" :options="chartOptions" />
        </div>
    </div>
</template>
