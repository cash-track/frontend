<script setup lang="ts">
import { ref, shallowRef, watch, onMounted, onUnmounted, nextTick, useTemplateRef } from 'vue'
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
import LoadErrorAlert from '@/components/Shared/LoadErrorAlert.vue'
import { useChargesGrouping } from '@/composables/useChargesGrouping'

const props = defineProps<{ tagID: string }>()

const { t, locale } = useI18n()
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
const lastErrorTag = ref<unknown>(null)
const errorCharges = ref<string | null>(null)
const lastErrorCharges = ref<unknown>(null)
const currentPage = ref(1)
const filter = ref<FilterState>({ dateFrom: '', dateTo: '' })
const showFilters = ref(false)
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const { chargesGrouped } = useChargesGrouping(charges, t, locale)

async function loadTag() {
    loadingTag.value = true
    errorTag.value = null
    lastErrorTag.value = null
    try {
        tag.value = await getTagById(selectedTagId.value)
        loadTotals()
        loadCharges(1)
    } catch (err) {
        errorTag.value = t('tags.statsLoadingError')
        lastErrorTag.value = err
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
    lastErrorCharges.value = null
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
    } catch (err) {
        lastErrorCharges.value = err
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
    if (loadingMore.value || !pagination.value?.hasNext) return
    loadingMore.value = true
    try {
        await loadCharges(currentPage.value + 1)
    } finally {
        loadingMore.value = false
    }
}

function setupObserver() {
    if (observer) observer.disconnect()
    observer = new IntersectionObserver(entries => {
        if (entries[0]?.isIntersecting) {
            loadMore()
        }
    }, { rootMargin: '200px' })
}

function observeSentinel() {
    nextTick(() => {
        if (sentinelRef.value && observer) {
            observer.disconnect()
            observer.observe(sentinelRef.value)
        }
    })
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

// Re-observe sentinel whenever loading finishes (sentinel enters DOM)
watch(loadingCharges, val => {
    if (!val) observeSentinel()
})
watch(loadingMore, val => {
    if (!val) observeSentinel()
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
    setupObserver()
    getCommonTags()
        .then(tags => { commonTags.value = tags })
        .catch(() => {})
        .finally(() => { loadingCommonTags.value = false })
    loadTag()
})

onUnmounted(() => {
    observer?.disconnect()
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
        <LoadErrorAlert
            v-if="errorTag"
            :title="errorTag"
            :error="lastErrorTag"
            retryable
            @retry="loadTag()"
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
                <LoadErrorAlert
                    v-if="errorCharges"
                    :title="errorCharges"
                    :error="lastErrorCharges"
                    retryable
                    class="mb-3"
                    @retry="loadCharges(1)"
                />
                <template v-if="!errorCharges">
                    <template v-for="[group, groupCharges] in chargesGrouped" :key="group">
                        <!-- Day group header -->
                        <div class="px-0 sm:px-4 py-2 -mx-4 sm:mx-0">
                            <div class="flex items-center gap-2">
                                <div class="w-6 shrink-0 h-px bg-black/10 dark:bg-white/10" />
                                <span class="text-sm text-muted">{{ group }}</span>
                                <div class="flex-1 h-px bg-black/10 dark:bg-white/10" />
                            </div>
                        </div>
                        <ChargeItem
                            v-for="charge in groupCharges"
                            :key="charge.id"
                            :charge="charge"
                            :wallet="charge.wallet!"
                            :show-wallet="true"
                            @updated="onChargeUpdated"
                            @deleted="onChargeDeleted"
                            @tag-selected="selectTag"
                        />
                    </template>
                    <div v-if="charges.length === 0" class="flex flex-col items-center justify-center py-12 text-muted">
                        <UIcon name="i-lucide-receipt" class="size-10 mb-2 opacity-30" />
                        <p class="text-sm">{{ t('charges.empty') }}</p>
                    </div>

                    <!-- Infinite scroll sentinel -->
                    <div ref="sentinelRef" class="h-1" />

                    <!-- Loading more spinner -->
                    <div v-if="loadingMore" class="flex justify-center py-4">
                        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
                        <span class="ml-2 text-sm text-muted">{{ t('charges.loadingMore') }}</span>
                    </div>
                </template>
            </template>
        </div>

    </div>
</template>
