<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Doughnut } from 'vue-chartjs'
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    type ChartData,
    type ChartOptions,
} from 'chart.js'
import { getChargesTotalByType, type ChargesTotalDataPoint } from '@/api/graph'
import { getWalletTags } from '@/api/tags'
import type { Currency } from '@/api/models/currency'
import type { Tag } from '@/api/models/tag'
import { useMoneyFormatter } from '@/composables/useMoneyFormatter'

ChartJS.register(Title, Tooltip, Legend, ArcElement)

const props = defineProps<{
    walletId: number
    currency: Currency | null
    walletTags?: Tag[]
    dateFrom?: string
    dateTo?: string
}>()

const { t } = useI18n()
const { format } = useMoneyFormatter()

const loading = ref(false)
const error = ref<string | null>(null)
const expenseData = ref<ChargesTotalDataPoint[]>([])
const incomeData = ref<ChargesTotalDataPoint[]>([])
const tags = ref<Tag[]>([])
const hasLoaded = ref(false)

const hideThresholdAmount = 8
const hideThresholdPercent = 15

function hashColor(name: string): string {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
        hash = hash & hash
    }
    let color = '#'
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 255
        color += ('00' + value.toString(16)).slice(-2)
    }
    return color
}

function getTagById(id: number): Tag | null {
    return tags.value.find(t => t.id === id) ?? null
}

function getLabel(tagIds: number[]): string {
    if (tagIds.length === 0) return t('tags.withoutTags')
    const names = tagIds
        .map(id => {
            const tag = getTagById(id)
            if (!tag) return null
            return tag.icon ? `${tag.icon} ${tag.name}` : tag.name
        })
        .filter(Boolean)
    return names.length > 0 ? names.join(', ') : t('tags.withoutTags')
}

function filterDataset(dataset: ChargesTotalDataPoint[]): ChargesTotalDataPoint[] {
    const items = dataset.filter(d => d.amount > 0)
    if (items.length <= hideThresholdAmount) return items

    const totalSum = items.reduce((sum, d) => sum + d.amount, 0)
    const visiblePercent = 100 - hideThresholdPercent
    let capSum = 0
    let visibleCount = 0

    for (const entry of items) {
        if ((capSum / totalSum) * 100 > visiblePercent) break
        capSum += entry.amount
        visibleCount++
    }

    const visible = items.slice(0, visibleCount)
    const rest = items.slice(visibleCount)

    if (rest.length > 0) {
        const otherAmount = rest.reduce((sum, d) => sum + d.amount, 0)
        visible.push({ amount: otherAmount, tags: [-1] })
    }

    return visible
}

function getLabelWithPercent(tagIds: number[], amount: number, totalSum: number): string {
    let label: string
    if (tagIds.length === 1 && tagIds[0] === -1) {
        const otherCount = expenseData.value.length + incomeData.value.length
        label = t('tags.otherTags', [otherCount])
    } else {
        label = getLabel(tagIds)
    }
    return `${label} ${((amount / totalSum) * 100).toFixed(0)}%`
}

function buildChartData(dataset: ChargesTotalDataPoint[]): ChartData<'doughnut'> {
    const filtered = filterDataset(dataset)
    const totalSum = dataset.filter(d => d.amount > 0).reduce((sum, d) => sum + d.amount, 0)
    return {
        labels: filtered.map(d => getLabelWithPercent(d.tags, d.amount, totalSum)),
        datasets: [{
            backgroundColor: filtered.map(d => hashColor(getLabel(d.tags))),
            data: filtered.map(d => d.amount),
        }],
    }
}

const expenseChartData = computed(() => buildChartData(expenseData.value))
const incomeChartData = computed(() => buildChartData(incomeData.value))

const hasExpenseData = computed(() => expenseData.value.some(d => d.amount > 0))
const hasIncomeData = computed(() => incomeData.value.some(d => d.amount > 0))

function buildChartOptions(): ChartOptions<'doughnut'> {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'left',
                align: 'center',
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const rawLabel = context.label?.replace(/\b\d{1,3}%$/g, '').trim() ?? ''
                        let label = `  ${rawLabel}`
                        if (context.parsed !== null && props.currency) {
                            label += ' — ' + format(context.parsed, props.currency)
                        }
                        return label
                    },
                },
            },
        },
    }
}

const chartOptions = computed(() => buildChartOptions())

async function loadData() {
    loading.value = true
    error.value = null
    try {
        const dateParams = {
            ...(props.dateFrom ? { 'date-from': props.dateFrom } : {}),
            ...(props.dateTo ? { 'date-to': props.dateTo } : {}),
        }
        const [expenseResult, incomeResult, resolvedTags] = await Promise.all([
            getChargesTotalByType(props.walletId, { 'charge-type': 'expense', ...dateParams }),
            getChargesTotalByType(props.walletId, { 'charge-type': 'income', ...dateParams }),
            props.walletTags !== undefined ? Promise.resolve(props.walletTags) : getWalletTags(props.walletId),
        ])
        expenseData.value = expenseResult
        incomeData.value = incomeResult
        tags.value = resolvedTags
        hasLoaded.value = true
    } catch {
        error.value = t('wallets.chartLoadingError')
    } finally {
        loading.value = false
    }
}

watch(() => props.walletTags, (t) => {
    if (t !== undefined) tags.value = t
}, { deep: true })
watch(() => [props.dateFrom, props.dateTo], () => loadData())

onMounted(() => loadData())

defineExpose({ reload: loadData })
</script>

<template>
    <div>
        <UAlert
            v-if="error && !hasLoaded"
            color="error"
            :description="error"
            icon="i-lucide-alert-circle"
        />

        <div v-else class="relative">
            <div
                v-if="loading"
                class="absolute inset-0 z-10 flex items-center justify-center bg-white/75 dark:bg-gray-900/75 backdrop-blur-[2px]"
            >
                <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 class="text-lg font-medium mb-2">
                        <span class="text-red-500">↓</span> {{ t('wallets.expense') }}
                    </h4>
                    <div v-if="hasExpenseData" class="relative h-[400px]">
                        <Doughnut :data="expenseChartData" :options="chartOptions" />
                    </div>
                </div>
                <div>
                    <h4 class="text-lg font-medium mb-2">
                        <span class="text-green-500">↑</span> {{ t('wallets.income') }}
                    </h4>
                    <div v-if="hasIncomeData" class="relative h-[400px]">
                        <Doughnut :data="incomeChartData" :options="chartOptions" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
