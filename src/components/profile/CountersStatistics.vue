<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCounterStats, type CounterStats } from '@/api/profile'

const { t } = useI18n()

const counters = ref<CounterStats | null>(null)
const loadFailed = ref(false)

const chargesExpense = computed(() => {
    if (!counters.value) return 0
    return counters.value.charges - counters.value.chargesIncome
})

onMounted(async () => {
    try {
        counters.value = await getCounterStats()
    } catch {
        loadFailed.value = true
    }
})
</script>

<template>
    <UCard>
        <template #header>
            <span class="text-sm font-semibold text-muted uppercase tracking-wide">
                {{ t('profile.counters') }}
            </span>
        </template>

        <div v-if="loadFailed" class="flex justify-center py-2">
            <UIcon name="i-lucide-triangle-alert" class="text-warning size-5" />
        </div>

        <div v-else-if="!counters" class="space-y-3">
            <USkeleton class="h-8 rounded" />
            <USkeleton class="h-8 rounded" />
        </div>

        <div v-else class="divide-y divide-default">
            <!-- Wallets row -->
            <div class="flex justify-around py-3">
                <UTooltip :text="t('profile.totalWalletsAmount')" :arrow="true">
                    <div class="flex flex-col items-center gap-0.5 text-muted cursor-default">
                        <div class="flex items-center gap-1.5">
                            <UIcon name="i-lucide-wallet" class="size-4" />
                            <span class="font-semibold">{{ counters.wallets }}</span>
                        </div>
                        <span class="text-xs text-muted">{{ t('profile.totalWalletsAmount') }}</span>
                    </div>
                </UTooltip>
                <UTooltip :text="t('profile.archivedWalletsAmount')" :arrow="true">
                    <div class="flex flex-col items-center gap-0.5 text-muted cursor-default">
                        <div class="flex items-center gap-1.5">
                            <UIcon name="i-lucide-archive" class="size-4" />
                            <span class="font-semibold">{{ counters.walletsArchived }}</span>
                        </div>
                        <span class="text-xs text-muted">{{ t('profile.archivedWalletsAmount') }}</span>
                    </div>
                </UTooltip>
            </div>

            <!-- Charges row -->
            <div class="flex justify-around py-3">
                <UTooltip :text="t('profile.totalChargesAmount')" :arrow="true">
                    <div class="flex flex-col items-center gap-0.5 text-muted cursor-default">
                        <div class="flex items-center gap-1.5">
                            <UIcon name="i-lucide-banknote" class="size-4" />
                            <span class="font-semibold">{{ counters.charges }}</span>
                        </div>
                        <span class="text-xs text-muted">{{ t('profile.totalChargesAmount') }}</span>
                    </div>
                </UTooltip>
                <UTooltip :text="t('profile.incomeChargesAmount')" :arrow="true">
                    <div class="flex flex-col items-center gap-0.5 text-success cursor-default">
                        <div class="flex items-center gap-1.5">
                            <UIcon name="i-lucide-arrow-up" class="size-4" />
                            <span class="font-semibold">{{ counters.chargesIncome }}</span>
                        </div>
                        <span class="text-xs text-muted">{{ t('profile.incomeChargesAmount') }}</span>
                    </div>
                </UTooltip>
                <UTooltip :text="t('profile.expenseChargesAmount')" :arrow="true">
                    <div class="flex flex-col items-center gap-0.5 text-error cursor-default">
                        <div class="flex items-center gap-1.5">
                            <UIcon name="i-lucide-arrow-down" class="size-4" />
                            <span class="font-semibold">{{ chargesExpense }}</span>
                        </div>
                        <span class="text-xs text-muted">{{ t('profile.expenseChargesAmount') }}</span>
                    </div>
                </UTooltip>
            </div>
        </div>
    </UCard>
</template>
