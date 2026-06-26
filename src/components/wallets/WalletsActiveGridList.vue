<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import draggable from 'vuedraggable'
import { useWalletsStore } from '@/stores/wallets'
import { sortWallets } from '@/api/wallets'
import type { Wallet } from '@/api/models/wallet'
import LoadErrorAlert from '@/components/Shared/LoadErrorAlert.vue'
import WalletCard from './WalletCard.vue'

const { t } = useI18n()
const walletsStore = useWalletsStore()
const { activeWallets, loading, failed, lastError } = storeToRefs(walletsStore)

const localWallets = ref<Wallet[]>([])

watch(activeWallets, (wallets) => {
    localWallets.value = [...wallets]
}, { immediate: true })

const showEmpty = computed(
    () => !loading.value && !failed.value && localWallets.value.length === 0,
)

async function onDragEnd() {
    await sortWallets(localWallets.value.map(w => w.id))
}
</script>

<template>
    <div>
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <USkeleton v-for="i in 3" :key="i" class="h-48 rounded-lg" />
        </div>

        <LoadErrorAlert
            v-else-if="failed"
            :title="t('wallets.listLoadingError')"
            :error="lastError"
            @retry="walletsStore.loadActive()"
        />

        <UAlert
            v-else-if="showEmpty"
            color="success"
            variant="soft"
            icon="i-lucide-wallet"
            :title="t('wallets.noWallets')"
            :description="t('wallets.noWalletsMessage')"
            :actions="[{
                label: t('wallets.noWalletsCreate'),
                color: 'success',
                variant: 'subtle',
                to: { name: 'wallets.create' },
            }]"
        />

        <draggable
            v-else
            v-model="localWallets"
            item-key="id"
            :animation="200"
            ghost-class="opacity-50"
            :delay="250"
            :delay-on-touch-only="true"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            @end="onDragEnd"
        >
            <template #item="{ element }">
                <WalletCard :wallet="element" />
            </template>
        </draggable>
    </div>
</template>
