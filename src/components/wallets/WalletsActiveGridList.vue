<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useWalletsStore } from '@/stores/wallets'
import WalletsGridList from './WalletsGridList.vue'

const { t } = useI18n()
const walletsStore = useWalletsStore()
const { activeWallets, loading, failed } = storeToRefs(walletsStore)

const showEmpty = computed(
    () => !loading.value && !failed.value && activeWallets.value.length === 0,
)
</script>

<template>
    <div>
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <USkeleton v-for="i in 3" :key="i" class="h-48 rounded-lg" />
        </div>

        <UAlert
            v-else-if="failed"
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            :title="t('wallets.listLoadingError')"
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

        <WalletsGridList
            v-else
            :wallets="activeWallets"
            :by-archived="false"
        />
    </div>
</template>
