<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getLimits, copyLimits } from '@/api/limits'
import { WalletLimit } from '@/api/models/limit'
import type { Limit } from '@/api/models/limit'
import type { Wallet } from '@/api/models/wallet'
import { getWalletsWithLimits } from '@/api/wallets'
import WalletLimitItem from './WalletLimitItem.vue'
import LimitForm from './LimitForm.vue'
import MoneyAmount from '@/components/Shared/MoneyAmount.vue'
import LoadErrorAlert from '@/components/Shared/LoadErrorAlert.vue'

const props = defineProps<{
    wallet: Wallet
}>()

const { t } = useI18n()

const limits = ref<WalletLimit[]>([])
const loading = ref(false)
const failed = ref(false)
const lastError = ref<unknown>(null)
const showCreateForm = ref(false)
const walletsWithLimits = ref<Wallet[]>([])
const copyLoading = ref(false)

const MAX_COPY_FROM_WALLETS = 10

const totalExpenseAmount = computed(() =>
    limits.value
        .filter(wl => wl.limit.operation === '-')
        .reduce((sum, wl) => sum + wl.amount, 0),
)

const totalExpenseLimitAmount = computed(() =>
    limits.value
        .filter(wl => wl.limit.operation === '-')
        .reduce((sum, wl) => sum + wl.limit.amount, 0),
)

const hasExpenseTotals = computed(() => totalExpenseLimitAmount.value > 0)

const copyDropdownItems = computed(() =>
    walletsWithLimits.value.map(w => ({
        label: w.name,
        onSelect: () => onCopyFrom(w),
    })),
)

async function loadWalletsWithLimits() {
    try {
        let wallets = await getWalletsWithLimits(false)
        if (wallets.length === 0) {
            wallets = await getWalletsWithLimits(true)
        }
        walletsWithLimits.value = wallets
            .filter(w => w.id !== props.wallet.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, MAX_COPY_FROM_WALLETS)
    } catch {
        // Non-fatal; just don't show the button
    }
}

async function loadLimits() {
    loading.value = true
    failed.value = false
    lastError.value = null
    try {
        limits.value = await getLimits(props.wallet.id)
        if (limits.value.length === 0) {
            await loadWalletsWithLimits()
        } else {
            walletsWithLimits.value = []
        }
    } catch (err) {
        failed.value = true
        lastError.value = err
    } finally {
        loading.value = false
    }
}

async function reloadLimitsSilently() {
    try {
        limits.value = await getLimits(props.wallet.id)
    } catch {
        // Non-fatal
    }
}

async function onCopyFrom(sourceWallet: Wallet) {
    copyLoading.value = true
    try {
        limits.value = await copyLimits(props.wallet.id, sourceWallet.id)
        walletsWithLimits.value = []
    } catch {
        // Non-fatal
    } finally {
        copyLoading.value = false
    }
}

function onLimitCreated(limit: Limit) {
    showCreateForm.value = false
    limits.value = [...limits.value, new WalletLimit({ amount: 0, percentage: 0, limit })]
    walletsWithLimits.value = []
    void reloadLimitsSilently()
}

function onLimitUpdated(limit: Limit) {
    limits.value = limits.value.map(wl =>
        wl.limit.id === limit.id
            ? new WalletLimit({ amount: wl.amount, percentage: wl.percentage, limit })
            : wl,
    )
    void reloadLimitsSilently()
}

function onLimitDeleted(limit: Limit) {
    limits.value = limits.value.filter(wl => wl.limit.id !== limit.id)
}

onMounted(() => loadLimits())
watch(() => props.wallet.id, () => loadLimits())

defineExpose({ reload: loadLimits, copyDropdownItems })
</script>

<template>
    <div class="space-y-1">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-4">
            <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
        </div>

        <!-- Error -->
        <LoadErrorAlert
            v-else-if="failed"
            :title="t('limits.loadingError')"
            :error="lastError"
            retryable
            @retry="loadLimits()"
        />

        <!-- Limits list -->
        <template v-else>
            <WalletLimitItem
                v-for="wl in limits"
                :key="wl.limit.id"
                :wallet-limit="wl"
                :wallet="wallet"
                @updated="onLimitUpdated"
                @deleted="onLimitDeleted"
            />

            <!-- Totals -->
            <div v-if="hasExpenseTotals" class="pt-4 mt-4 border-t border-default">
                <div class="flex justify-between items-center">
                    <span class="text-lg">{{ t('limits.total') }}</span>
                    <span class="text-red-500">
                        <UIcon name="i-lucide-arrow-down" class="hidden sm:inline-block size-6 mr-1 -mt-0.5" />
                        <MoneyAmount :amount="totalExpenseAmount" :currency="wallet.defaultCurrency" />
                        <span class="text-sm text-muted"> / <MoneyAmount :amount="totalExpenseLimitAmount" :currency="wallet.defaultCurrency" /></span>
                    </span>
                </div>
            </div>

            <!-- Add limit button + Copy From -->
            <div class="pt-3 flex gap-2">
                <UButton
                    v-if="!showCreateForm"
                    variant="solid"
                    color="primary"
                    size="md"
                    icon="i-lucide-plus"
                    @click="showCreateForm = true"
                >
                    {{ t('limits.createLimit') }}
                </UButton>

                <UDropdownMenu
                    v-if="!limits.length && walletsWithLimits.length"
                    :items="copyDropdownItems"
                    :ui="{ content: 'max-h-60' }"
                    arrow size="md"
                >
                    <UButton
                        variant="outline"
                        color="neutral"
                        size="md"
                        icon="i-lucide-copy"
                        :loading="copyLoading"
                    >
                        {{ t('limits.copyFrom') }}
                    </UButton>
                </UDropdownMenu>
            </div>

            <!-- Create form -->
            <div v-if="showCreateForm" class="border border-default rounded-lg p-4">
                <LimitForm
                    :wallet="wallet"
                    @created="onLimitCreated"
                    @cancelled="showCreateForm = false"
                />
            </div>
        </template>
    </div>
</template>
