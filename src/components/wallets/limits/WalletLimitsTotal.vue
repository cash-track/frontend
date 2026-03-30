<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getLimits } from '@/api/limits'
import type { WalletLimit } from '@/api/models/limit'
import type { Limit } from '@/api/models/limit'
import type { Wallet } from '@/api/models/wallet'
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

function formatAmount(value: number): string {
    if (!props.wallet.defaultCurrency) return String(value)
    return format(value, props.wallet.defaultCurrency)
}

async function loadLimits() {
    loading.value = true
    try {
        limits.value = await getLimits(props.wallet.id)
    } catch {
        // Silently fail
    } finally {
        loading.value = false
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

defineExpose({ reload: loadLimits })
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

            <!-- Add limit button -->
            <div class="pt-3">
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

                <!-- Create form -->
                <div v-if="showCreateForm" class="border border-default rounded-lg p-4">
                    <LimitForm
                        :wallet="wallet"
                        @created="onLimitCreated"
                        @cancelled="showCreateForm = false"
                    />
                </div>
            </div>
        </template>
    </div>
</template>
