import { shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { Wallet } from '@/api/models/wallet'
import { getUnarchived } from '@/api/wallets'

export const useWalletsStore = defineStore('wallets', () => {
    const activeWallets = shallowRef<Wallet[]>([])
    const loading = shallowRef(false)
    const failed = shallowRef(false)

    async function loadActive() {
        loading.value = true
        failed.value = false
        try {
            activeWallets.value = await getUnarchived()
        } catch {
            activeWallets.value = []
            failed.value = true
        } finally {
            loading.value = false
        }
    }

    return { activeWallets, loading, failed, loadActive }
})
