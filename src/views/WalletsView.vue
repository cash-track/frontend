<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWalletsStore } from '@/stores/wallets'
import WalletsActiveGridList from '@/components/wallets/WalletsActiveGridList.vue'
import WalletsGridList from '@/components/wallets/WalletsGridList.vue'

const { t } = useI18n()
const walletsStore = useWalletsStore()

onMounted(() => walletsStore.loadActive())

const tabs = computed(() => [
    { label: t('wallets.activeTitle'), slot: 'active' as const },
    { label: t('wallets.archivedTitle'), slot: 'archived' as const },
])
</script>

<template>
    <div>
        <div class="flex justify-between items-center mb-4">
            <h1 class="text-2xl font-semibold">{{ t('wallets.wallets') }}</h1>
            <UButton
                icon="i-lucide-plus"
                :label="t('wallets.newWallet')"
                :to="{ name: 'wallets.create' }"
            />
        </div>

        <UTabs :items="tabs" class="mt-2">
            <template #active>
                <WalletsActiveGridList class="mt-3" />
            </template>
            <template #archived>
                <WalletsGridList :wallets="[]" :by-archived="true" class="mt-3" />
            </template>
        </UTabs>
    </div>
</template>
