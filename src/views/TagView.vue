<script setup lang="ts">
import { ref, shallowRef, watch, onMounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { getTagById, getTagCharges, getTagTotals, getCommonTags } from '@/api/tags'
import type { Tag } from '@/api/models/tag'
import type { Charge, ChargeTotal } from '@/api/models/charge'
import type { Pagination } from '@/api/models/pagination'
import type { FilterState } from '@/components/wallets/charges/ChargesFilter.vue'
import TagChip from '@/components/tags/Tag.vue'
import TotalsRow from '@/components/Shared/TotalsRow.vue'
import ChargesFilter from '@/components/wallets/charges/ChargesFilter.vue'
import ChargeItem from '@/components/wallets/charges/ChargeItem.vue'
import TagChargesFlowChart from '@/components/wallets/charges/TagChargesFlowChart.vue'
import WalletsActiveShortList from '@/components/wallets/WalletsActiveShortList.vue'

const props = defineProps<{ tagID: string }>()

const { t } = useI18n()
const router = useRouter()

const chartRef = useTemplateRef<InstanceType<typeof TagChargesFlowChart>>('chartRef')

const selectedTagId = ref(parseInt(props.tagID, 10))

const tag = shallowRef<Tag | null>(null)
const commonTags = shallowRef<Tag[]>([])
const totals = shallowRef<ChargeTotal | null>(null)
const charges = ref<Charge[]>([])
const pagination = ref<Pagination | null>(null)
const loadingTag = ref(true)
const loadingTotals = ref(true)
const loadingCharges = ref(true)
const loadingCommonTags = ref(true)
const loadingMore = ref(false)
const errorTag = ref<string | null>(null)
const errorCharges = ref<string | null>(null)
const currentPage = ref(1)
const filter = ref<FilterState>({ dateFrom: '', dateTo: '' })
const showFilters = ref(false)


async function loadTag() {
    loadingTag.value = true
    errorTag.value = null
    try {
        tag.value = await getTagById(selectedTagId.value)
        loadTotals()
        loadCharges(1)
    } catch {
        errorTag.value = t('tags.statsLoadingError')
        loadingTotals.value = false
        loadingCharges.value = false
    } finally {
        loadingTag.value = false
    }
}

async function loadTotals() {
    loadingTotals.value = true
    try {
        totals.value = await getTagTotals(selectedTagId.value, {
            'date-from': filter.value.dateFrom || undefined,
            'date-to': filter.value.dateTo || undefined,
        })
    } catch {
        // Non-fatal — just don't show totals
    } finally {
        loadingTotals.value = false
    }
}

async function loadCharges(page: number) {
    if (page === 1) loadingCharges.value = true
    errorCharges.value = null
    try {
        const res = await getTagCharges(selectedTagId.value, {
            page,
            'date-from': filter.value.dateFrom || undefined,
            'date-to': filter.value.dateTo || undefined,
        })
        if (page === 1) {
            charges.value = res.data
        } else {
            charges.value = [...charges.value, ...res.data]
        }
        pagination.value = res.pagination
        currentPage.value = page
    } catch {
        if (page === 1) {
            errorCharges.value = t('charges.loadingError')
            charges.value = []
        } else {
            errorCharges.value = t('charges.loadingMoreError')
        }
    } finally {
        if (page === 1) loadingCharges.value = false
    }
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

async function selectTag(id: number) {
    if (id === selectedTagId.value) return
    selectedTagId.value = id
    tag.value = null
    totals.value = null
    charges.value = []
    pagination.value = null
    currentPage.value = 1
    loadingTotals.value = true
    loadingCharges.value = true
    router.replace({ name: 'tags.show', params: { tagID: id.toString() } })
    await loadTag()
}

// Handle external navigation (browser back/forward between tag URLs).
// selectTag's own guard (`if (id === selectedTagId.value) return`) is the
// single source of truth — no duplicate check needed here.
watch(() => props.tagID, async newTagID => {
    await selectTag(parseInt(newTagID, 10))
})

function onFilterChange(f: FilterState) {
    filter.value = f
    loadTotals()
    loadCharges(1)
    // Chart reloads via its own watch(() => props.filter) after parent re-renders and propagates the new prop.
    // Calling chartRef.reload() here would run before the prop update and use the stale filter.
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

onMounted(() => {
    getCommonTags()
        .then(tags => { commonTags.value = tags })
        .catch(() => {})
        .finally(() => { loadingCommonTags.value = false })
    loadTag()
})
</script>

<template>
    <div class="space-y-6">
        <WalletsActiveShortList />

        <!-- Tag header -->
        <div class="flex items-center gap-3">
            <template v-if="loadingTag">
                <USkeleton class="h-7 w-20 rounded-full" />
                <USkeleton class="h-8 w-40 rounded-md" />
            </template>
            <template v-else-if="tag">
                <TagChip :tag="tag" class="text-base" />
                <h1 class="text-2xl font-semibold">{{ t('tags.stats') }}</h1>
            </template>
        </div>

        <USeparator />

        <!-- Common tags navigation -->
        <div class="flex flex-wrap gap-2">
            <template v-if="loadingCommonTags">
                <USkeleton v-for="i in 6" :key="i" class="h-7 w-16 rounded-full" />
            </template>
            <template v-else-if="commonTags.length > 0">
                <TagChip
                    v-for="commonTag in commonTags"
                    :key="commonTag.id"
                    :tag="commonTag"
                    :highlighted="commonTag.id === selectedTagId"
                    @click="selectTag(commonTag.id)"
                />
            </template>
        </div>

        <!-- Tag load error -->
        <UAlert
            v-if="errorTag"
            color="error"
            :description="errorTag"
            icon="i-lucide-alert-circle"
        />

        <USeparator />

        <!-- Totals -->
        <TotalsRow
            :loading="loadingTotals"
            :income-amount="totals?.totalIncomeAmount"
            :expense-amount="totals?.totalExpenseAmount"
            :currency="totals?.currency"
        />

        <!-- Chart (manages its own loading overlay) -->
        <div class="border border-default rounded-lg p-4">
            <TagChargesFlowChart
                ref="chartRef"
                :tag-id="selectedTagId"
                :currency="totals?.currency ?? null"
                :filter="filter"
            />
        </div>

        <!-- Filter toggle -->
        <div class="flex gap-2">
            <UButton
                variant="outline"
                color="neutral"
                size="md"
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
        <div class="rounded-lg">
            <template v-if="loadingCharges">
                <div v-for="i in 5" :key="i" class="flex items-center gap-3 px-4 py-3 border-b border-default last:border-b-0">
                    <USkeleton class="size-8 rounded-full shrink-0" />
                    <div class="flex-1 space-y-1.5">
                        <USkeleton class="h-4 w-1/3 rounded" />
                        <USkeleton class="h-3 w-1/4 rounded" />
                    </div>
                    <USkeleton class="h-5 w-20 rounded" />
                </div>
            </template>
            <template v-else>
                <UAlert
                    v-if="errorCharges"
                    color="error"
                    icon="i-lucide-alert-circle"
                    :description="errorCharges"
                    class="mb-3"
                />
                <div v-if="errorCharges" class="flex justify-center mt-2">
                    <UButton
                        variant="outline"
                        color="neutral"
                        size="md"
                        @click="loadCharges(1)"
                    >
                        {{ t('retry') }}
                    </UButton>
                </div>
                <template v-if="!errorCharges">
                    <ChargeItem
                        v-for="charge in charges"
                        :key="charge.id"
                        :charge="charge"
                        :wallet="charge.wallet!"
                        @updated="onChargeUpdated"
                        @deleted="onChargeDeleted"
                        @tag-selected="selectTag"
                    />
                    <div v-if="charges.length === 0" class="flex flex-col items-center justify-center py-12 text-muted">
                        <UIcon name="i-lucide-receipt" class="size-10 mb-2 opacity-30" />
                        <p class="text-sm">{{ t('charges.empty') }}</p>
                    </div>
                </template>
            </template>
        </div>

        <!-- Load more -->
        <div v-if="!errorCharges && pagination && currentPage < pagination.totalPages" class="flex justify-center">
            <UButton
                variant="outline"
                color="neutral"
                :loading="loadingMore"
                @click="loadMore"
            >
                {{ t('charges.loadMore') }}
            </UButton>
        </div>
    </div>
</template>
