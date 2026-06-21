<script setup lang="ts">
import { shallowRef, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getWallet } from '@/api/wallets'
import type { Wallet } from '@/api/models/wallet'
import WalletEdit from '@/components/wallets/WalletEdit.vue'

const props = defineProps<{ walletID: string }>()

const { t } = useI18n()
const wallet = shallowRef<Wallet | null>(null)
const loading = shallowRef(false)
const error = shallowRef<string | null>(null)

onMounted(async () => {
    loading.value = true
    try {
        wallet.value = await getWallet(Number(props.walletID))
    } catch {
        error.value = t('wallets.loadingError')
    } finally {
        loading.value = false
    }
})
</script>

<template>
    <div class="max-w-lg mx-auto">
        <div v-if="loading" class="flex justify-center py-12">
            <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
        </div>
        <UAlert
            v-else-if="error"
            color="error"
            :description="error"
            icon="i-lucide-alert-circle"
        />
        <WalletEdit v-else-if="wallet" :wallet="wallet" />
    </div>
</template>
