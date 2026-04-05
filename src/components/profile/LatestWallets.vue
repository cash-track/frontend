<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getLatestWallets } from '@/api/profile'
import type { Wallet } from '@/api/models/wallet'
import WalletCard from '@/components/wallets/WalletCard.vue'

const { t } = useI18n()

const wallets = ref<Wallet[] | null>(null)
const loadFailed = ref(false)

const walletsOrdered = computed(() => {
    if (!wallets.value) return []
    return [...wallets.value].sort((a, b) => {
        if (a.isActive === b.isActive) return 0
        return a.isActive ? -1 : 1
    })
})

onMounted(async () => {
    try {
        wallets.value = await getLatestWallets()
    } catch {
        loadFailed.value = true
    }
})
</script>

<template>
    <div>
        <h2 class="text-lg font-semibold mb-4">{{ t('profile.latestWallets') }}</h2>

        <UAlert
            v-if="loadFailed"
            color="warning"
            variant="subtle"
            :title="t('wallets.listLoadingError')"
            class="mb-4"
        />

        <div v-else-if="wallets === null" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <USkeleton v-for="i in 4" :key="i" class="h-40 rounded-lg" />
        </div>

        <div v-else-if="walletsOrdered.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WalletCard
                v-for="wallet in walletsOrdered"
                :key="wallet.id"
                :wallet="wallet"
            />
        </div>

        <p v-else class="text-sm text-muted">—</p>
    </div>
</template>
