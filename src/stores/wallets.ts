import { shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { Wallet } from '@/api/models/wallet'
import { getUnarchived } from '@/api/wallets'

export const useWalletsStore = defineStore('wallets', () => {
    const activeWallets = shallowRef<Wallet[]>([])
    const loading = shallowRef(false)
    const failed = shallowRef(false)
    const lastError = shallowRef<unknown>(null)

    async function loadActive() {
        loading.value = true
        failed.value = false
        lastError.value = null
        try {
            activeWallets.value = await getUnarchived()
        } catch (error) {
            activeWallets.value = []
            failed.value = true
            lastError.value = error
        } finally {
            loading.value = false
        }
    }

    return { activeWallets, loading, failed, lastError, loadActive }
})
