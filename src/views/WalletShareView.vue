<script setup lang="ts">
import { shallowRef, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getWallet } from '@/api/wallets'
import type { Wallet } from '@/api/models/wallet'
import WalletShare from '@/components/wallets/WalletShare.vue'
import LoadErrorAlert from '@/components/Shared/LoadErrorAlert.vue'

const props = defineProps<{ walletID: string }>()

const { t } = useI18n()
const wallet = shallowRef<Wallet | null>(null)
const loading = shallowRef(false)
const error = shallowRef<string | null>(null)
const lastError = shallowRef<unknown>(null)

async function load() {
    loading.value = true
    error.value = null
    lastError.value = null
    try {
        wallet.value = await getWallet(Number(props.walletID))
    } catch (err) {
        error.value = t('wallets.loadingError')
        lastError.value = err
    } finally {
        loading.value = false
    }
}

onMounted(load)
</script>

<template>
    <div class="max-w-lg mx-auto">
        <div v-if="loading" class="flex justify-center py-12">
            <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
        </div>
        <LoadErrorAlert
            v-else-if="error"
            :title="error"
            :error="lastError"
            retryable
            @retry="load()"
        />
        <WalletShare v-else-if="wallet" :wallet="wallet" />
    </div>
</template>
