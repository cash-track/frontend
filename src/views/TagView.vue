<script setup lang="ts">
import { ref, shallowRef, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getTags, getTagCharges, getTagTotals } from '@/api/tags'
import type { Tag } from '@/api/models/tag'
import type { Charge, ChargeTotal } from '@/api/models/charge'
import type { Pagination } from '@/api/models/pagination'
import type { FilterState } from '@/components/wallets/charges/ChargesFilter.vue'
import TagChip from '@/components/tags/Tag.vue'
import ChargesFilter from '@/components/wallets/charges/ChargesFilter.vue'
import { useMoneyFormatter } from '@/composables/useMoneyFormatter'

const props = defineProps<{ tagID: string }>()

const { t } = useI18n()
const { format } = useMoneyFormatter()

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
        const allTags = await getTags()
        tag.value = allTags.find(t => t.id === tagId.value) ?? null
        if (!tag.value) {
            error.value = t('tags.statsLoadingError')
            return
        }
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
}

function formatDate(date: Date): string {
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
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
            <div class="border border-default rounded-lg divide-y divide-default">
                <div
                    v-for="charge in charges"
                    :key="charge.id"
                    class="flex items-center justify-between px-4 py-3 gap-4"
                >
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">{{ charge.title }}</p>
                        <p class="text-xs text-muted">{{ formatDate(charge.dateTime) }}</p>
                    </div>
                    <span
                        class="text-sm font-semibold shrink-0"
                        :class="charge.operation === '+' ? 'text-success' : 'text-error'"
                    >
                        {{ charge.operation === '+' ? '+' : '-' }}{{ charge.wallet?.defaultCurrency ? format(charge.amount, charge.wallet.defaultCurrency) : charge.amount }}
                    </span>
                </div>

                <!-- Empty state -->
                <div v-if="charges.length === 0" class="flex flex-col items-center justify-center py-12 text-muted">
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
