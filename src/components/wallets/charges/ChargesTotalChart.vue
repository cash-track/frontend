<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
}>()

const { t } = useI18n()
const { format } = useMoneyFormatter()

const loading = ref(false)
const error = ref<string | null>(null)
const data = ref<ChargesTotalDataPoint[]>([])
const tags = ref<Tag[]>([])

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

const chartData = computed<ChartData<'doughnut'>>(() => {
    const items = data.value.filter(d => d.amount > 0)
    return {
        labels: items.map(d => getLabel(d.tags)),
        datasets: [{
            backgroundColor: items.map(d => hashColor(getLabel(d.tags))),
            data: items.map(d => d.amount),
        }],
    }
})

const chartOptions = computed<ChartOptions<'doughnut'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            align: 'start',
        },
        tooltip: {
            callbacks: {
                label: (context) => {
                    let label = `  ${context.label}`
                    if (context.parsed !== null && props.currency) {
                        label += ' — ' + format(context.parsed, props.currency)
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
        const [totalData, walletTags] = await Promise.all([
            getChargesTotalByType(props.walletId),
            getWalletTags(props.walletId),
        ])
        data.value = totalData
        tags.value = walletTags
    } catch {
        error.value = t('wallets.chartLoadingError')
    } finally {
        loading.value = false
    }
}

onMounted(() => loadData())

defineExpose({ reload: loadData })
</script>

<template>
    <div>
        <div v-if="loading" class="flex justify-center py-8">
            <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
        </div>

        <UAlert
            v-else-if="error"
            color="error"
            :description="error"
            icon="i-lucide-alert-circle"
        />

        <div v-else-if="data.length > 0" class="relative h-[400px]">
            <Doughnut :data="chartData" :options="chartOptions" />
        </div>
    </div>
</template>
