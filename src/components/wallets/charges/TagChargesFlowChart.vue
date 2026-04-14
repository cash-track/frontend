<script setup lang="ts">
import { shallowRef, computed, watch, onMounted } from 'vue'
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
import { getTagChargesFlow, type ChargesFlowDataPoint, type GetChargesFlowParams } from '@/api/graph'
import type { Currency } from '@/api/models/currency'
import type { FilterState } from '@/components/wallets/charges/ChargesFilter.vue'
import { useMoneyFormatter } from '@/composables/useMoneyFormatter'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps<{
    tagId: number
    currency: Currency | null
    filter?: FilterState
}>()

const { t } = useI18n()
const { format } = useMoneyFormatter()

type GroupBy = 'day' | 'month' | 'year'

const groupBy = shallowRef<GroupBy>('day')
const loading = shallowRef(false)
const error = shallowRef<string | null>(null)
const dataPoints = shallowRef<ChargesFlowDataPoint[]>([])
const hasLoaded = shallowRef(false)

const groupByOptions = computed(() => [
    { label: t('wallets.groupByDay'), value: 'day' as GroupBy },
    { label: t('wallets.groupByMonth'), value: 'month' as GroupBy },
    { label: t('wallets.groupByYear'), value: 'year' as GroupBy },
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
        const params: GetChargesFlowParams = { 'group-by': groupBy.value }
        if (props.filter?.dateFrom) params['date-from'] = props.filter.dateFrom
        if (props.filter?.dateTo) params['date-to'] = props.filter.dateTo
        dataPoints.value = await getTagChargesFlow(props.tagId, params)
        hasLoaded.value = true
    } catch {
        error.value = t('wallets.chartLoadingError')
    } finally {
        loading.value = false
    }
}

watch(groupBy, () => loadData())
watch(() => props.tagId, () => loadData())
watch(() => props.filter, () => loadData(), { deep: true })
onMounted(() => loadData())

defineExpose({ reload: loadData })
</script>

<template>
    <div>
        <div class="flex items-center justify-end gap-2 mb-4">
            <span class="text-sm text-muted">{{ t('wallets.groupBy') }}</span>
            <USelect
                v-model="groupBy"
                :items="groupByOptions"
                value-key="value"
                label-key="label"
                size="sm"
                class="w-32"
            />
        </div>

        <UAlert
            v-if="error && !hasLoaded"
            color="error"
            :description="error"
            icon="i-lucide-alert-circle"
        />

        <div v-else class="relative h-[300px]">
            <div
                v-if="loading"
                class="absolute inset-0 z-10 flex items-center justify-center bg-white/75 dark:bg-gray-900/75 backdrop-blur-[2px]"
            >
                <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
            </div>
            <Bar :data="chartData" :options="chartOptions" />
        </div>
    </div>
</template>
