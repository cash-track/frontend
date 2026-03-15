import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockGetUnarchived } = vi.hoisted(() => ({ mockGetUnarchived: vi.fn() }))
vi.mock('@/api/wallets', () => ({ getUnarchived: mockGetUnarchived }))

import { useWalletsStore } from '../wallets'
import type { Wallet } from '@/api/models/wallet'

const mockWallet = { id: 1, name: 'Main' } as unknown as Wallet

describe('useWalletsStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('initial state: empty wallets, not loading, not failed', () => {
        const store = useWalletsStore()
        expect(store.activeWallets).toEqual([])
        expect(store.loading).toBe(false)
        expect(store.failed).toBe(false)
    })

    it('loadActive() fetches and stores wallets', async () => {
        mockGetUnarchived.mockResolvedValue([mockWallet])
        const store = useWalletsStore()

        await store.loadActive()

        expect(store.activeWallets).toEqual([mockWallet])
        expect(store.loading).toBe(false)
        expect(store.failed).toBe(false)
    })

    it('loadActive() sets failed=true and clears wallets on error', async () => {
        mockGetUnarchived.mockRejectedValue(new Error('Network error'))
        const store = useWalletsStore()
        // pre-populate to verify it clears
        store.activeWallets = [mockWallet]

        await store.loadActive()

        expect(store.activeWallets).toEqual([])
        expect(store.failed).toBe(true)
        expect(store.loading).toBe(false)
    })

    it('loadActive() resets failed before each call', async () => {
        mockGetUnarchived.mockRejectedValueOnce(new Error('fail'))
        const store = useWalletsStore()
        await store.loadActive()
        expect(store.failed).toBe(true)

        mockGetUnarchived.mockResolvedValue([mockWallet])
        await store.loadActive()
        expect(store.failed).toBe(false)
        expect(store.activeWallets).toEqual([mockWallet])
    })
})
