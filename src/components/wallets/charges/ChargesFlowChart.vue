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
    type ChartDataset,
} from 'chart.js'
import { getChargesFlowByDate, type ChargesFlowDataPoint, type GetChargesFlowParams } from '@/api/graph'
import type { Currency } from '@/api/models/currency'
import type { Tag } from '@/api/models/tag'
import { useMoneyFormatter } from '@/composables/useMoneyFormatter'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps<{
    walletId: number
    currency: Currency | null
    tags?: Tag[]
    dateFrom?: string
    dateTo?: string
}>()

const { t } = useI18n()
const { format } = useMoneyFormatter()

type GroupBy = 'day' | 'month' | 'year'

const groupBy = ref<GroupBy>('day')
const loading = ref(false)
const error = ref<string | null>(null)
const dataPoints = ref<ChargesFlowDataPoint[]>([])
const hasLoaded = ref(false)

const groupByOptions = computed(() => [
    { label: t('wallets.groupByDay'), value: 'day' as GroupBy },
    { label: t('wallets.groupByMonth'), value: 'month' as GroupBy },
    { label: t('wallets.groupByYear'), value: 'year' as GroupBy },
])

function stableColor(key: string): string {
    let hash = 0
    for (const char of key) hash = (hash << 5) - hash + char.charCodeAt(0)
    hash = hash & hash
    const h = Math.abs(hash) % 360
    return `hsl(${h}, 60%, 50%)`
}

const isTagMode = computed(() => !!props.tags?.length)

const chartData = computed<ChartData<'bar'>>(() => {
    if (isTagMode.value) {
        const labels = dataPoints.value.map(d => d.date)
        const datasets: ChartDataset<'bar'>[] = []
        const multiTag = props.tags!.length > 1
        for (const tag of props.tags!) {
            const expenseData = dataPoints.value.map(d => d.tags?.[tag.id]?.expense ?? 0)
            const incomeData = dataPoints.value.map(d => d.tags?.[tag.id]?.income ?? 0)
            if (expenseData.some(v => v !== 0)) {
                datasets.push({
                    label: `↓ ${tag.name}`,
                    backgroundColor: multiTag ? stableColor(`exp-${tag.id}`) : '#dc3545',
                    stack: 'expense',
                    data: expenseData,
                })
            }
            if (incomeData.some(v => v !== 0)) {
                datasets.push({
                    label: `↑ ${tag.name}`,
                    backgroundColor: multiTag ? stableColor(`inc-${tag.id}`) : '#28a745',
                    stack: 'income',
                    data: incomeData,
                })
            }
        }
        return { labels, datasets }
    }
    return {
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
    }
})

const hasData = computed(() =>
    chartData.value.datasets.some(ds => (ds.data as number[]).some(v => v !== 0))
)

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: isTagMode.value ? { stacked: true } : {},
        y: {
            // Headroom above the tallest bar so it never touches the axis ceiling
            // (chart.js otherwise caps the axis exactly at a round data max, e.g. 120).
            grace: '5%',
            stacked: isTagMode.value,
            ticks: {
                precision: 0,
                callback: (value) => {
                    if (typeof value !== 'number') return value
                    if (!props.currency) return Math.round(value)
                    return format(value, props.currency, false)
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
        if (props.tags?.length) {
            params.tags = props.tags.map(t => t.id).join(',')
        }
        if (props.dateFrom) params['date-from'] = props.dateFrom
        if (props.dateTo) params['date-to'] = props.dateTo
        dataPoints.value = await getChargesFlowByDate(props.walletId, params)
        hasLoaded.value = true
    } catch {
        error.value = t('wallets.chartLoadingError')
    } finally {
        loading.value = false
    }
}

watch(groupBy, () => loadData())
watch(() => props.tags, () => loadData(), { deep: true })
watch(() => [props.dateFrom, props.dateTo], () => loadData())
onMounted(() => loadData())

defineExpose({ reload: loadData, chartOptions })
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
            <div v-if="hasData" class="relative h-full">
                <Bar :data="chartData" :options="chartOptions" />
            </div>
            <div v-else-if="!loading" class="absolute inset-0 flex flex-col items-center justify-center text-muted">
                <UIcon name="i-lucide-chart-no-axes-column" class="size-10 mb-2 opacity-30" />
                <p class="text-sm">{{ t('wallets.chartNoData') }}</p>
            </div>
        </div>
    </div>
</template>
