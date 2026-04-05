<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getChargesFlowStats, type ChargesFlowStats } from '@/api/profile'
import ChargesStatsCard from './ChargesStatsCard.vue'

const { t } = useI18n()

const stats = ref<ChargesFlowStats | null>(null)
const loadFailed = ref(false)

onMounted(async () => {
    try {
        stats.value = await getChargesFlowStats()
    } catch {
        loadFailed.value = true
    }
})
</script>

<template>
    <div>
        <UAlert
            v-if="loadFailed"
            color="warning"
            variant="subtle"
            :title="t('profile.chargesFlowLoadingError')"
            class="mb-4"
        />
        <template v-else-if="stats">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ChargesStatsCard
                    type="+"
                    :stats="stats.income"
                    :currency="stats.currency"
                />
                <ChargesStatsCard
                    type="-"
                    :stats="stats.expense"
                    :currency="stats.currency"
                />
            </div>
            <UAlert
                color="neutral"
                variant="subtle"
                icon="i-lucide-info"
                :description="t('profile.chargesFlowNotice')"
                class="mb-4"
            />
        </template>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <USkeleton class="h-48 rounded-lg" />
            <USkeleton class="h-48 rounded-lg" />
        </div>
    </div>
</template>
