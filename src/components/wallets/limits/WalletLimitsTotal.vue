<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getLimits, copyLimits } from '@/api/limits'
import type { WalletLimit } from '@/api/models/limit'
import type { Limit } from '@/api/models/limit'
import type { Wallet } from '@/api/models/wallet'
import { getWalletsWithLimits } from '@/api/wallets'
import { useMoneyFormatter } from '@/composables/useMoneyFormatter'
import WalletLimitItem from './WalletLimitItem.vue'
import LimitForm from './LimitForm.vue'

const props = defineProps<{
    wallet: Wallet
}>()

const { t } = useI18n()
const { format } = useMoneyFormatter()

const limits = ref<WalletLimit[]>([])
const loading = ref(false)
const showCreateForm = ref(false)
const walletsWithLimits = ref<Wallet[]>([])
const copyLoading = ref(false)

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
        click: () => onCopyFrom(w),
    })),
)

function formatAmount(value: number): string {
    if (!props.wallet.defaultCurrency) return String(value)
    return format(value, props.wallet.defaultCurrency)
}

async function loadWalletsWithLimits() {
    try {
        let wallets = await getWalletsWithLimits(false)
        if (wallets.length === 0) {
            wallets = await getWalletsWithLimits(true)
        }
        walletsWithLimits.value = wallets.filter(w => w.id !== props.wallet.id)
    } catch {
        // Non-fatal; just don't show the button
    }
}

async function loadLimits() {
    loading.value = true
    try {
        limits.value = await getLimits(props.wallet.id)
        if (limits.value.length === 0) {
            await loadWalletsWithLimits()
        } else {
            walletsWithLimits.value = []
        }
    } catch {
        // Silently fail
    } finally {
        loading.value = false
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

function onLimitCreated() {
    showCreateForm.value = false
    void loadLimits()
}

function onLimitUpdated() {
    void loadLimits()
}

function onLimitDeleted(limit: Limit) {
    limits.value = limits.value.filter(wl => wl.limit.id !== limit.id)
}

onMounted(() => loadLimits())

defineExpose({ reload: loadLimits, copyDropdownItems })
</script>

<template>
    <div class="space-y-1">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-4">
            <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
        </div>

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
            <div v-if="hasExpenseTotals" class="pt-3 mt-1 border-t border-default">
                <div class="flex justify-between items-center">
                    <span class="text-sm text-muted">{{ t('limits.total') }}</span>
                    <span class="text-red-500">
                        <UIcon name="i-lucide-arrow-down" class="hidden sm:inline-block" />
                        {{ formatAmount(totalExpenseAmount) }}
                        <span class="text-sm text-muted">/ {{ formatAmount(totalExpenseLimitAmount) }}</span>
                    </span>
                </div>
            </div>

            <!-- Add limit button + Copy From -->
            <div class="pt-3 flex gap-2">
                <UButton
                    v-if="!showCreateForm"
                    variant="outline"
                    color="primary"
                    size="sm"
                    icon="i-lucide-plus"
                    @click="showCreateForm = true"
                >
                    {{ t('limits.createLimit') }}
                </UButton>

                <UDropdownMenu
                    v-if="!limits.length && walletsWithLimits.length"
                    :items="copyDropdownItems"
                >
                    <UButton
                        variant="outline"
                        color="neutral"
                        size="sm"
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
