<script setup lang="ts">
import { shallowRef, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Wallet } from '@/api/models/wallet'
import { getArchived } from '@/api/wallets'
import LoadErrorAlert from '@/components/Shared/LoadErrorAlert.vue'
import WalletCard from './WalletCard.vue'

const props = defineProps<{
    wallets: Wallet[]
    byArchived: boolean
}>()

const { t } = useI18n()

const archivedWallets = shallowRef<Wallet[]>([])
const loading = shallowRef(false)
const failed = shallowRef(false)
const lastError = shallowRef<unknown>(null)

const displayWallets = computed(() =>
    props.byArchived ? archivedWallets.value : props.wallets,
)

async function reload() {
    if (!props.byArchived) return

    loading.value = true
    failed.value = false
    lastError.value = null
    try {
        archivedWallets.value = await getArchived()
    } catch (error) {
        failed.value = true
        lastError.value = error
    } finally {
        loading.value = false
    }
}

onMounted(reload)
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
            retryable
            @retry="reload()"
        />

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <WalletCard
                v-for="wallet in displayWallets"
                :key="wallet.id"
                :wallet="wallet"
            />
        </div>
    </div>
</template>
