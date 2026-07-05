<script setup lang="ts">
import { shallowRef, ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { getWallet, getWalletTotals, getWalletUsers } from '@/api/wallets'
import type { Charge } from '@/api/models/charge'
import { getWalletTags } from '@/api/tags'
import type { Wallet } from '@/api/models/wallet'
import type { WalletTotal } from '@/api/models/wallet'
import type { User } from '@/api/models/user'
import type { Tag } from '@/api/models/tag'
import type { FilterState } from '@/components/wallets/charges/ChargesFilter.vue'
import { useWalletsStore } from '@/stores/wallets'
import TagChip from '@/components/tags/Tag.vue'
import WalletHeader from '@/components/wallets/WalletHeader.vue'
import ChargeCreate from '@/components/wallets/charges/ChargeCreate.vue'
import ChargesList from '@/components/wallets/charges/ChargesList.vue'
import ChargesFilter from '@/components/wallets/charges/ChargesFilter.vue'
import ChargesFlowChart from '@/components/wallets/charges/ChargesFlowChart.vue'
import ChargesTotalChart from '@/components/wallets/charges/ChargesTotalChart.vue'
import WalletLimitsTotal from '@/components/wallets/limits/WalletLimitsTotal.vue'
import WalletsActiveShortList from '@/components/wallets/WalletsActiveShortList.vue'
import MoneyAmount from '@/components/Shared/MoneyAmount.vue'

const props = defineProps<{ walletID: string }>()

const { t } = useI18n()
const router = useRouter()
const walletsStore = useWalletsStore()

const wallet = shallowRef<Wallet | null>(null)
const totals = shallowRef<WalletTotal | null>(null)
const users = ref<User[]>([])
const walletTags = ref<Tag[]>([])
const selectedTags = ref<Tag[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const showCreateForm = ref(false)
const showFilters = ref(false)
const showGraph = ref(false)
const showLimits = ref(false)
const showTags = shallowRef(false)
const filter = ref<FilterState>({ dateFrom: '', dateTo: '' })
const titleAutocompleteOpen = ref(false)
const chargesListRef = ref<InstanceType<typeof ChargesList> | null>(null)
const flowChartRef = ref<InstanceType<typeof ChargesFlowChart> | null>(null)
const totalChartRef = ref<InstanceType<typeof ChargesTotalChart> | null>(null)
const limitsRef = ref<InstanceType<typeof WalletLimitsTotal> | null>(null)

async function loadWallet() {
    loading.value = true
    error.value = null

    try {
        const walletId = Number(props.walletID)
        const [w, tot, u, tags] = await Promise.all([
            getWallet(walletId),
            getWalletTotals(walletId),
            getWalletUsers(walletId),
            getWalletTags(walletId),
        ])
        wallet.value = w
        totals.value = tot
        users.value = u
        walletTags.value = tags
    } catch {
        error.value = t('wallets.loadingError')
        wallet.value = null
        totals.value = null
        users.value = []
        walletTags.value = []
    } finally {
        loading.value = false
    }
}

async function refreshTotals() {
    if (!wallet.value) return
    if (wallet.value.id !== Number(props.walletID)) return
    try {
        const params: { tags?: string; 'date-from'?: string; 'date-to'?: string } = {}
        if (tagFilterString.value) params.tags = tagFilterString.value
        if (filter.value.dateFrom) params['date-from'] = filter.value.dateFrom
        if (filter.value.dateTo) params['date-to'] = filter.value.dateTo
        totals.value = await getWalletTotals(wallet.value.id, Object.keys(params).length ? params : undefined)
    } catch {
        // Silently fail
    }
}

function onChargeCreated(charge: Charge) {
    showCreateForm.value = false
    chargesListRef.value?.onChargeCreated(charge)
    refreshTotals()
    if (showGraph.value) {
        flowChartRef.value?.reload()
        totalChartRef.value?.reload()
    }
    // Limits stays mounted (unmount-on-hide=false), so keep its totals fresh even when collapsed
    limitsRef.value?.reload()
    walletsStore.loadActive()
}

function onChargeUpdated() {
    refreshTotals()
    if (showGraph.value) {
        flowChartRef.value?.reload()
        totalChartRef.value?.reload()
    }
    limitsRef.value?.reload()
    walletsStore.loadActive()
}

function onChargeDeleted() {
    refreshTotals()
    if (showGraph.value) {
        flowChartRef.value?.reload()
        totalChartRef.value?.reload()
    }
    limitsRef.value?.reload()
    walletsStore.loadActive()
}

function onChargesMoved() {
    refreshTotals()
    if (showGraph.value) {
        flowChartRef.value?.reload()
        totalChartRef.value?.reload()
    }
    limitsRef.value?.reload()
    walletsStore.loadActive()
}

function onWalletChanged() {
    loadWallet()
}

function onFilterChange(f: FilterState) {
    filter.value = f
    refreshTotals()
    if (showGraph.value) {
        flowChartRef.value?.reload()
        totalChartRef.value?.reload()
    }
}

const tagFilterString = computed(() =>
    selectedTags.value.length ? selectedTags.value.map(t => t.id).join(',') : undefined,
)

const chargesFilter = computed<FilterState>(() => ({
    ...filter.value,
    tags: tagFilterString.value,
}))

const unselectedTags = computed(() =>
    walletTags.value.filter(tag => !selectedTags.value.some(s => s.id === tag.id)),
)

const totalPerTags = computed(() => {
    if (!totals.value?.tags || !selectedTags.value.length) return []
    return selectedTags.value.map(tag => {
        const tagTotal = totals.value!.tags.find(t => t.tagId === tag.id)
        const incomePercent = totals.value!.totalIncomeAmount > 0
            ? Math.round((tagTotal?.totalIncomeAmount ?? 0) / totals.value!.totalIncomeAmount * 100)
            : 0
        const expensePercent = totals.value!.totalExpenseAmount > 0
            ? Math.round((tagTotal?.totalExpenseAmount ?? 0) / totals.value!.totalExpenseAmount * 100)
            : 0
        return {
            tag,
            totalIncomeAmount: tagTotal?.totalIncomeAmount ?? 0,
            totalExpenseAmount: tagTotal?.totalExpenseAmount ?? 0,
            incomePercent,
            expensePercent,
            hasIncome: (tagTotal?.totalIncomeAmount ?? 0) > 0,
            hasExpense: (tagTotal?.totalExpenseAmount ?? 0) > 0,
        }
    })
})

function onTagToggle(tag: Tag) {
    const index = selectedTags.value.findIndex(t => t.id === tag.id)
    if (index === -1) {
        selectedTags.value = [...selectedTags.value, tag]
    } else {
        selectedTags.value = selectedTags.value.filter(t => t.id !== tag.id)
    }
}

function onTagFromCharge(tagId: number) {
    const tag = walletTags.value.find(t => t.id === tagId)
    if (tag) {
        showTags.value = true
        onTagToggle(tag)
    } else {
        router.push({ name: 'tags.show', params: { tagID: tagId.toString() } })
    }
}

watch(selectedTags, () => {
    refreshTotals()
    if (showGraph.value) {
        flowChartRef.value?.reload()
        totalChartRef.value?.reload()
    }
}, { deep: true })

onMounted(() => loadWallet())
watch(() => props.walletID, () => {
    showCreateForm.value = false
    showFilters.value = false
    showGraph.value = false
    showLimits.value = false
    showTags.value = false
    filter.value = { dateFrom: '', dateTo: '' }
    selectedTags.value = []
    loadWallet()
})

watch(showCreateForm, (open) => {
    if (!open) titleAutocompleteOpen.value = false
})

defineExpose({ wallet, error, showCreateForm, showFilters, showGraph, showLimits, showTags })
</script>

<template>
    <div>
        <!-- Wallet switcher: always visible and interactive, even while a wallet loads -->
        <WalletsActiveShortList :current-wallet-id="Number(props.walletID)" />

        <!-- Initial load skeleton (no wallet to show yet) -->
        <div v-if="loading && !wallet" class="space-y-6">
            <div class="space-y-3">
                <USkeleton class="h-8 w-64 rounded-md" />
                <USkeleton class="h-5 w-40 rounded-md" />
                <div class="flex gap-6 pt-2">
                    <USkeleton class="h-10 w-32 rounded-md" />
                    <USkeleton class="h-10 w-32 rounded-md" />
                </div>
            </div>
            <div class="flex flex-wrap gap-2">
                <USkeleton v-for="n in 5" :key="n" class="h-9 w-24 rounded-md" />
            </div>
            <div class="space-y-3">
                <USkeleton v-for="n in 6" :key="n" class="h-14 w-full rounded-md" />
            </div>
        </div>

        <!-- Error with no previous content to fall back to -->
        <UAlert
            v-else-if="error && !wallet"
            color="error"
            :description="error"
            icon="i-lucide-alert-circle"
        />

        <!-- Content: kept mounted while switching wallets so it never collapses -->
        <div v-else-if="wallet" class="relative">
            <!-- Non-blocking switch indicator -->
            <div
                v-if="loading"
                class="absolute top-0 right-0 z-20 flex items-center gap-2 text-sm text-muted"
            >
                <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
                {{ t('loadingData') }}
            </div>

            <div :class="{ 'opacity-60 pointer-events-none transition-opacity': loading }">
                <!-- Header -->
                <WalletHeader
                    :wallet="wallet"
                    :totals="totals"
                    :users="users"
                    @wallet-changed="onWalletChanged"
                />

                <!-- Tool buttons -->
                <div class="flex flex-wrap gap-2 mt-6 mb-4">
                    <UButton
                        variant="outline"
                        color="neutral"
                        size="md"
                        icon="i-lucide-tags"
                        :disabled="!walletTags.length"
                        :class="{ '!bg-elevated': showTags }"
                        @click="showTags = !showTags"
                    >
                        {{ t('wallets.tags') }}
                    </UButton>
                    <UButton
                        variant="outline"
                        color="neutral"
                        size="md"
                        icon="i-lucide-sliders-horizontal"
                        :class="{ '!bg-elevated': showLimits }"
                        @click="showLimits = !showLimits"
                    >
                        {{ t('wallets.limits') }}
                    </UButton>
                    <UButton
                        variant="outline"
                        color="neutral"
                        size="md"
                        icon="i-lucide-bar-chart-3"
                        :class="{ '!bg-elevated': showGraph }"
                        @click="showGraph = !showGraph"
                    >
                        {{ t('wallets.graph') }}
                    </UButton>
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
                    <UButton
                        v-if="wallet.isActive"
                        variant="solid"
                        color="primary"
                        size="md"
                        icon="i-lucide-plus"
                        @click="showCreateForm = !showCreateForm"
                    >
                        {{ t('charges.new') }}
                    </UButton>
                </div>

                <!-- Create form -->
                <UCollapsible
                    v-if="wallet.isActive"
                    v-model:open="showCreateForm"
                    :ui="{ content: titleAutocompleteOpen ? 'overflow-visible' : '' }"
                >
                    <template #content>
                        <div class="border border-default rounded-lg p-4 mb-4">
                            <ChargeCreate
                                :wallet="wallet"
                                :wallet-tags="walletTags"
                                @charge-created="onChargeCreated"
                                @cancelled="showCreateForm = false"
                                @dropdown-open-change="titleAutocompleteOpen = $event"
                            />
                        </div>
                    </template>
                </UCollapsible>

                <!-- Limits -->
                <UCollapsible v-model:open="showLimits" :unmount-on-hide="false">
                    <template #content>
                        <div class="border border-default rounded-lg p-4 mb-4">
                            <WalletLimitsTotal
                                ref="limitsRef"
                                :wallet="wallet"
                            />
                        </div>
                    </template>
                </UCollapsible>

                <!-- Tags section -->
                <UCollapsible v-model:open="showTags">
                    <template #content>
                        <div class="border border-default rounded-lg p-4 mb-4">
                            <div class="flex flex-wrap gap-2 mb-6">
                                <TagChip
                                    v-for="tag in unselectedTags"
                                    :key="tag.id"
                                    :tag="tag"
                                    @click="onTagToggle(tag)"
                                />
                            </div>
                            <div
                                v-for="item in totalPerTags"
                                :key="item.tag.id"
                                class="flex items-center justify-between py-3 border-t border-default"
                            >
                                <TagChip :tag="item.tag" :highlighted="true" :removable="true" @click="onTagToggle(item.tag)" />
                                <div class="flex gap-4 text-lg">
                                    <span v-if="item.hasIncome" class="font-medium">
                                        <UIcon name="i-lucide-arrow-up" class="size-5 hidden sm:inline text-success mr-2 -mt-1" />
                                        <MoneyAmount class="text-success" :amount="item.totalIncomeAmount" :currency="wallet!.defaultCurrency" />
                                        <span class="text-muted font-normal text-xs"> / {{ item.incomePercent }}%</span>
                                    </span>
                                    <span v-if="item.hasExpense" class="font-medium">
                                        <UIcon name="i-lucide-arrow-down" class="size-5 hidden sm:inline text-error mr-2 -mt-1" />
                                        <MoneyAmount class="text-error" :amount="item.totalExpenseAmount" :currency="wallet!.defaultCurrency" />
                                        <span class="text-muted font-normal text-xs"> / {{ item.expensePercent }}%</span>
                                    </span>
                                </div>
                            </div>
                            <div v-if="selectedTags.length" class="pt-3 border-t border-default">
                                <UButton
                                    variant="soft"
                                    color="neutral"
                                    size="md"
                                    icon="i-lucide-x"
                                    :name="t('wallets.clear')"
                                    :aria-label="t('wallets.clear')"
                                    @click="selectedTags = []"
                                >
                                    {{ t('wallets.clear') }}
                                </UButton>
                            </div>
                        </div>
                    </template>
                </UCollapsible>

                <!-- Charts -->
                <UCollapsible v-model:open="showGraph">
                    <template #content>
                        <div class="space-y-6 mb-4">
                            <div class="border border-default rounded-lg p-4">
                                <ChargesFlowChart
                                    ref="flowChartRef"
                                    :wallet-id="wallet.id"
                                    :currency="wallet.defaultCurrency"
                                    :tags="selectedTags"
                                    :date-from="filter.dateFrom || undefined"
                                    :date-to="filter.dateTo || undefined"
                                />
                            </div>
                            <div class="border border-default rounded-lg p-4">
                                <ChargesTotalChart
                                    ref="totalChartRef"
                                    :wallet-id="wallet.id"
                                    :currency="wallet.defaultCurrency"
                                    :wallet-tags="walletTags"
                                    :tags="selectedTags"
                                    :date-from="filter.dateFrom || undefined"
                                    :date-to="filter.dateTo || undefined"
                                />
                            </div>
                        </div>
                    </template>
                </UCollapsible>

                <!-- Filter -->
                <UCollapsible v-model:open="showFilters">
                    <template #content>
                        <div class="border border-default rounded-lg p-4 mb-4">
                            <ChargesFilter @filter-change="onFilterChange" />
                        </div>
                    </template>
                </UCollapsible>

                <!-- Charges list -->
                <div class="rounded-lg">
                    <ChargesList
                        ref="chargesListRef"
                        :wallet="wallet"
                        :wallet-tags="walletTags"
                        :filter="chargesFilter"
                        @charge-updated="onChargeUpdated"
                        @charge-deleted="onChargeDeleted"
                        @charges-moved="onChargesMoved"
                        @tag-selected="onTagFromCharge"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
