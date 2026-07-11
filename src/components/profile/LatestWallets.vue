<script setup lang="ts">
import { ref, shallowRef, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getLatestWallets } from '@/api/profile'
import type { Wallet } from '@/api/models/wallet'
import LoadErrorAlert from '@/components/Shared/LoadErrorAlert.vue'
import WalletCard from '@/components/wallets/WalletCard.vue'

const { t } = useI18n()

const wallets = ref<Wallet[] | null>(null)
const loadFailed = ref(false)
const lastError = shallowRef<unknown>(null)

const walletsOrdered = computed(() => {
    if (!wallets.value) return []
    return [...wallets.value].sort((a, b) => {
        if (a.isActive === b.isActive) return 0
        return a.isActive ? -1 : 1
    })
})

async function load() {
    wallets.value = null
    loadFailed.value = false
    lastError.value = null
    try {
        wallets.value = await getLatestWallets()
    } catch (error) {
        loadFailed.value = true
        lastError.value = error
    }
}

onMounted(load)
</script>

<template>
    <div>
        <h2 class="text-lg font-semibold mb-4">{{ t('profile.latestWallets') }}</h2>

        <LoadErrorAlert
            v-if="loadFailed"
            :title="t('wallets.listLoadingError')"
            :error="lastError"
            class="mb-4"
            retryable
            @retry="load()"
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
