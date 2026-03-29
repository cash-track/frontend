<script setup lang="ts">
import { shallowRef, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getWallet, getWalletTotals, getWalletUsers } from '@/api/wallets'
import type { Wallet } from '@/api/models/wallet'
import type { WalletTotal } from '@/api/models/wallet'
import type { UserShort } from '@/api/models/user'
import type { FilterState } from '@/components/wallets/charges/ChargesFilter.vue'
import WalletHeader from '@/components/wallets/WalletHeader.vue'
import ChargeCreate from '@/components/wallets/charges/ChargeCreate.vue'
import ChargesList from '@/components/wallets/charges/ChargesList.vue'
import ChargesFilter from '@/components/wallets/charges/ChargesFilter.vue'
import ChargesFlowChart from '@/components/wallets/charges/ChargesFlowChart.vue'
import ChargesTotalChart from '@/components/wallets/charges/ChargesTotalChart.vue'
import WalletLimitsTotal from '@/components/wallets/limits/WalletLimitsTotal.vue'

const props = defineProps<{ walletID: string }>()

const { t } = useI18n()

const wallet = shallowRef<Wallet | null>(null)
const totals = shallowRef<WalletTotal | null>(null)
const users = ref<UserShort[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const showCreateForm = ref(false)
const showFilters = ref(false)
const showGraph = ref(false)
const showLimits = ref(false)
const filter = ref<FilterState>({ dateFrom: '', dateTo: '' })

const chargesListRef = ref<InstanceType<typeof ChargesList> | null>(null)
const flowChartRef = ref<InstanceType<typeof ChargesFlowChart> | null>(null)
const totalChartRef = ref<InstanceType<typeof ChargesTotalChart> | null>(null)
const limitsRef = ref<InstanceType<typeof WalletLimitsTotal> | null>(null)

async function loadWallet() {
    loading.value = true
    error.value = null

    try {
        const walletId = Number(props.walletID)
        const [w, t, u] = await Promise.all([
            getWallet(walletId),
            getWalletTotals(walletId),
            getWalletUsers(walletId),
        ])
        wallet.value = w
        totals.value = t
        users.value = u
    } catch {
        error.value = t('wallets.loadingError')
    } finally {
        loading.value = false
    }
}

async function refreshTotals() {
    if (!wallet.value) return
    try {
        totals.value = await getWalletTotals(wallet.value.id)
    } catch {
        // Silently fail
    }
}

function onChargeCreated() {
    showCreateForm.value = false
    chargesListRef.value?.onChargeCreated()
    refreshTotals()
    if (showGraph.value) {
        flowChartRef.value?.reload()
        totalChartRef.value?.reload()
    }
    if (showLimits.value) {
        limitsRef.value?.reload()
    }
}

function onChargeUpdated() {
    refreshTotals()
    if (showGraph.value) {
        flowChartRef.value?.reload()
        totalChartRef.value?.reload()
    }
    if (showLimits.value) {
        limitsRef.value?.reload()
    }
}

function onChargeDeleted() {
    refreshTotals()
    if (showGraph.value) {
        flowChartRef.value?.reload()
        totalChartRef.value?.reload()
    }
    if (showLimits.value) {
        limitsRef.value?.reload()
    }
}

function onWalletChanged() {
    loadWallet()
}

function onFilterChange(f: FilterState) {
    filter.value = f
}

onMounted(() => loadWallet())
</script>

<template>
    <div>
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

        <!-- Content -->
        <div v-else-if="wallet">
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
                    v-if="wallet.isActive"
                    variant="outline"
                    color="neutral"
                    size="sm"
                    icon="i-lucide-plus"
                    :class="{ '!bg-elevated': showCreateForm }"
                    @click="showCreateForm = !showCreateForm"
                >
                    {{ t('charges.new') }}
                </UButton>
                <UButton
                    variant="outline"
                    color="neutral"
                    size="sm"
                    icon="i-lucide-sliders-horizontal"
                    :class="{ '!bg-elevated': showLimits }"
                    @click="showLimits = !showLimits"
                >
                    {{ t('wallets.limits') }}
                </UButton>
                <UButton
                    variant="outline"
                    color="neutral"
                    size="sm"
                    icon="i-lucide-bar-chart-3"
                    :class="{ '!bg-elevated': showGraph }"
                    @click="showGraph = !showGraph"
                >
                    {{ t('wallets.graph') }}
                </UButton>
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

            <!-- Create form -->
            <div v-if="showCreateForm && wallet.isActive" class="border border-default rounded-lg p-4 mb-4">
                <ChargeCreate
                    :wallet="wallet"
                    @charge-created="onChargeCreated"
                />
            </div>

            <!-- Limits -->
            <div v-if="showLimits" class="border border-default rounded-lg p-4 mb-4">
                <WalletLimitsTotal
                    ref="limitsRef"
                    :wallet="wallet"
                />
            </div>

            <!-- Charts -->
            <div v-if="showGraph" class="space-y-6 mb-4">
                <div class="border border-default rounded-lg p-4">
                    <ChargesFlowChart
                        ref="flowChartRef"
                        :wallet-id="wallet.id"
                        :currency="wallet.defaultCurrency"
                    />
                </div>
                <div class="border border-default rounded-lg p-4">
                    <ChargesTotalChart
                        ref="totalChartRef"
                        :wallet-id="wallet.id"
                        :currency="wallet.defaultCurrency"
                    />
                </div>
            </div>

            <!-- Filter -->
            <div v-if="showFilters" class="border border-default rounded-lg p-4 mb-4">
                <ChargesFilter @filter-change="onFilterChange" />
            </div>

            <!-- Charges list -->
            <div class="border border-default rounded-lg">
                <ChargesList
                    ref="chargesListRef"
                    :wallet="wallet"
                    :filter="filter"
                    @charge-updated="onChargeUpdated"
                    @charge-deleted="onChargeDeleted"
                    @charge-created="refreshTotals"
                />
            </div>
        </div>
    </div>
</template>
