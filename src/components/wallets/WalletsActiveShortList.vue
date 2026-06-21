<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useWalletsStore } from '@/stores/wallets'
import type { WalletShort } from '@/api/models/wallet'
import MoneyAmount from '@/components/Shared/MoneyAmount.vue'

const props = defineProps<{
    currentWalletId?: number
}>()

const walletsStore = useWalletsStore()
const { activeWallets, loading, failed } = storeToRefs(walletsStore)

const wallets = computed(() => activeWallets.value.filter(w => w.isActive))

function isCurrentWallet(wallet: WalletShort): boolean {
    return props.currentWalletId !== undefined && wallet.id === props.currentWalletId
}

onMounted(() => {
    if (activeWallets.value.length === 0 && !loading.value && !failed.value) {
        walletsStore.loadActive()
    }
})
</script>

<template>
    <div v-if="wallets.length" class="relative overflow-hidden mb-4">
        <!-- Right fade gradient -->
        <div class="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-gradient-to-r from-transparent to-white dark:to-gray-700" />
        <!-- Scrollable row -->
        <div class="flex overflow-x-auto scrollbar-hide pr-12">
            <RouterLink
                v-for="wallet in wallets"
                :key="wallet.id"
                :to="{ name: 'wallets.show', params: { walletID: wallet.id.toString() } }"
                :aria-current="isCurrentWallet(wallet) ? 'page' : undefined"
                :class="[
                    'flex-none flex items-center gap-3 px-4 py-2 border border-default border-l-0 first:border-l hover:bg-accented text-sm whitespace-nowrap first:rounded-l-lg last:rounded-r-lg cursor-pointer transition-colors no-underline',
                    isCurrentWallet(wallet) ? 'bg-elevated font-semibold' : '',
                ]"
            >
                <span class="max-w-[200px] truncate font-medium">{{ wallet.name }}</span>
                <MoneyAmount class="text-secondary font-semibold" :amount="wallet.totalAmount" :currency="wallet.defaultCurrency" />
            </RouterLink>
        </div>
    </div>
</template>
