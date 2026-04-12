<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { getTagById, getTagCharges, getTagTotals } from '@/api/tags'
import type { Tag } from '@/api/models/tag'
import type { Charge, ChargeTotal } from '@/api/models/charge'
import type { Pagination } from '@/api/models/pagination'
import type { FilterState } from '@/components/wallets/charges/ChargesFilter.vue'
import TagChip from '@/components/tags/Tag.vue'
import ChargesFilter from '@/components/wallets/charges/ChargesFilter.vue'
import ChargeItem from '@/components/wallets/charges/ChargeItem.vue'
import TagChargesFlowChart from '@/components/wallets/charges/TagChargesFlowChart.vue'
import { useMoneyFormatter } from '@/composables/useMoneyFormatter'
import WalletsActiveShortList from '@/components/wallets/WalletsActiveShortList.vue'

const props = defineProps<{ tagID: string }>()

const { t } = useI18n()
const { format } = useMoneyFormatter()
const router = useRouter()

const chartRef = useTemplateRef<InstanceType<typeof TagChargesFlowChart>>('chartRef')

const tag = shallowRef<Tag | null>(null)
const totals = shallowRef<ChargeTotal | null>(null)
const charges = ref<Charge[]>([])
const pagination = ref<Pagination | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const currentPage = ref(1)
const filter = ref<FilterState>({ dateFrom: '', dateTo: '' })
const showFilters = ref(false)

const tagId = computed(() => parseInt(props.tagID, 10))

const hasIncome = computed(() => (totals.value?.totalIncomeAmount ?? 0) > 0)
const hasExpense = computed(() => (totals.value?.totalExpenseAmount ?? 0) > 0)
const hasTotals = computed(() => totals.value?.currency != null && (hasIncome.value || hasExpense.value))

async function loadTag() {
    loading.value = true
    error.value = null
    try {
        tag.value = await getTagById(tagId.value)
        await Promise.all([loadTotals(), loadCharges(1)])
    } catch {
        error.value = t('tags.statsLoadingError')
    } finally {
        loading.value = false
    }
}

async function loadTotals() {
    try {
        totals.value = await getTagTotals(tagId.value)
    } catch {
        // Non-fatal — just don't show totals
    }
}

async function loadCharges(page: number) {
    const res = await getTagCharges(tagId.value, page)
    if (page === 1) {
        charges.value = res.data
    } else {
        charges.value = [...charges.value, ...res.data]
    }
    pagination.value = res.pagination
    currentPage.value = page
}

async function loadMore() {
    if (!pagination.value || currentPage.value >= pagination.value.totalPages) return
    loadingMore.value = true
    try {
        await loadCharges(currentPage.value + 1)
    } finally {
        loadingMore.value = false
    }
}

function onFilterChange(f: FilterState) {
    filter.value = f
    loadCharges(1).catch(() => {})
    chartRef.value?.reload()
}

async function onChargeUpdated(charge: Charge) {
    const index = charges.value.findIndex(c => c.id === charge.id)
    if (index !== -1) charges.value[index] = charge
    await loadTotals()
    chartRef.value?.reload()
}

async function onChargeDeleted(chargeId: string) {
    charges.value = charges.value.filter(c => c.id !== chargeId)
    await loadTotals()
    chartRef.value?.reload()
}

function onTagSelected(selectedTagId: number) {
    router.push({ name: 'tags.show', params: { tagID: selectedTagId.toString() } })
}

onMounted(loadTag)
</script>

<template>
    <div class="space-y-6">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
            <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
        </div>

        <!-- Error -->
        <UAlert
            v-else-if="error"
            color="error"
            :description="error"
            icon="i-lucide-alert-circle"
        />

        <template v-else-if="tag">
            <WalletsActiveShortList />

            <!-- Tag header -->
            <div class="flex items-center gap-3">
                <TagChip :tag="tag" class="text-base" />
                <h1 class="text-2xl font-semibold">{{ t('tags.stats') }}</h1>
            </div>

            <!-- Totals -->
            <div v-if="hasTotals" class="flex flex-wrap gap-6">
                <div v-if="hasIncome" class="flex items-center gap-2">
                    <UIcon name="i-lucide-arrow-up" class="size-5 text-success" />
                    <div>
                        <p class="text-xs text-muted uppercase tracking-wide">{{ t('wallets.income') }}</p>
                        <p class="text-lg font-semibold text-success">
                            {{ format(totals!.totalIncomeAmount, totals!.currency!) }}
                        </p>
                    </div>
                </div>
                <div v-if="hasExpense" class="flex items-center gap-2">
                    <UIcon name="i-lucide-arrow-down" class="size-5 text-error" />
                    <div>
                        <p class="text-xs text-muted uppercase tracking-wide">{{ t('wallets.expense') }}</p>
                        <p class="text-lg font-semibold text-error">
                            {{ format(totals!.totalExpenseAmount, totals!.currency!) }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Chart -->
            <div class="border border-default rounded-lg p-4">
                <TagChargesFlowChart
                    ref="chartRef"
                    :tag-id="tagId"
                    :currency="totals?.currency ?? null"
                    :filter="filter"
                />
            </div>

            <!-- Filter toggle -->
            <div class="flex gap-2">
                <UButton
                    variant="outline"
                    color="neutral"
                    size="sm"
                    icon="i-lucide-filter"
                    :class="{ '!bg-elevated': showFilters }"
                    @click="showFilters = !showFilters"
                >
                    {{ t('wallets.filters') }}
                </UButton>
            </div>

            <!-- Filters -->
            <div v-if="showFilters" class="border border-default rounded-lg p-4">
                <ChargesFilter @filter-change="onFilterChange" />
            </div>

            <!-- Charges list -->
            <div class="border border-default rounded-lg">
                <ChargeItem
                    v-for="charge in charges"
                    :key="charge.id"
                    :charge="charge"
                    :wallet="charge.wallet!"
                    @updated="onChargeUpdated"
                    @deleted="onChargeDeleted"
                    @tag-selected="onTagSelected"
                />

                <!-- Empty state -->
                <div v-if="charges.length === 0 && !loading" class="flex flex-col items-center justify-center py-12 text-muted">
                    <UIcon name="i-lucide-receipt" class="size-10 mb-2 opacity-30" />
                    <p class="text-sm">{{ t('charges.empty') }}</p>
                </div>
            </div>

            <!-- Load more -->
            <div v-if="pagination && currentPage < pagination.totalPages" class="flex justify-center">
                <UButton
                    variant="outline"
                    color="neutral"
                    :loading="loadingMore"
                    @click="loadMore"
                >
                    {{ t('charges.loadingMore') }}
                </UButton>
            </div>
        </template>
    </div>
</template>
