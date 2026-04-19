import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import WalletLimitsTotal from '../WalletLimitsTotal.vue'
import { Wallet } from '@/api/models/wallet'
import { WalletLimit, Limit } from '@/api/models/limit'
import { Currency } from '@/api/models/currency'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

vi.mock('@/api/limits', () => ({
    getLimits: vi.fn(),
    copyLimits: vi.fn(),
}))

vi.mock('@/api/wallets', () => ({
    getWalletsWithLimits: vi.fn(),
}))

import { getLimits, copyLimits } from '@/api/limits'
import { getWalletsWithLimits } from '@/api/wallets'

const usd = new Currency({ id: 'USD', code: 'USD', name: 'US Dollar', char: '$', rate: 1, updatedAt: new Date() })

function makeWallet(id = 1, name = 'Test Wallet'): Wallet {
    return new Wallet({
        id, name,
        slug: name.toLowerCase().replace(/ /g, '-'),
        totalAmount: 1000,
        isActive: true, isPublic: false, isArchived: false,
        defaultCurrencyCode: 'USD', defaultCurrency: usd,
        createdAt: new Date(), updatedAt: new Date(),
        users: [], latestCharges: [],
    })
}

function makeWalletLimit(id = 1): WalletLimit {
    return new WalletLimit({
        amount: 100,
        percentage: 10,
        limit: new Limit({
            id, operation: '-', amount: 1000, walletId: 1,
            createdAt: new Date(), updatedAt: new Date(),
            tags: [], wallet: null,
        }),
    })
}

const mountOptions = {
    global: {
        stubs: {
            UIcon: true,
            UButton: true,
            UDropdownMenu: true,
            WalletLimitItem: true,
            LimitForm: true,
            MoneyAmount: true,
        },
    },
}

function mountComponent(wallet = makeWallet()) {
    return mount(WalletLimitsTotal, {
        ...mountOptions,
        props: { wallet },
    })
}

// Helper to access component's exposed copyDropdownItems
function getCopyItems(wrapper: ReturnType<typeof mountComponent>) {
    return (wrapper.vm as unknown as { copyDropdownItems: Array<{ label: string; onSelect: () => void }> }).copyDropdownItems
}

describe('WalletLimitsTotal', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(getLimits).mockResolvedValue([])
        vi.mocked(getWalletsWithLimits).mockResolvedValue([])
        vi.mocked(copyLimits).mockResolvedValue([])
    })

    it('does not show Copy From when wallet already has limits', async () => {
        vi.mocked(getLimits).mockResolvedValue([makeWalletLimit()])
        const wrapper = mountComponent()
        await flushPromises()
        expect(wrapper.text()).not.toContain('limits.copyFrom')
    })

    it('does not show Copy From when no other wallets have limits', async () => {
        vi.mocked(getLimits).mockResolvedValue([])
        vi.mocked(getWalletsWithLimits).mockResolvedValue([])
        const wrapper = mountComponent()
        await flushPromises()
        expect(wrapper.text()).not.toContain('limits.copyFrom')
    })

    it('shows Copy From dropdown when no limits and unarchived wallets have limits', async () => {
        const other = makeWallet(2, 'Other Wallet')
        vi.mocked(getLimits).mockResolvedValue([])
        vi.mocked(getWalletsWithLimits).mockImplementation(async (archived) => archived ? [] : [other])
        const wrapper = mountComponent()
        await flushPromises()
        expect(wrapper.text()).toContain('limits.copyFrom')
    })

    it('falls back to archived wallets when no unarchived wallets have limits', async () => {
        const archived = makeWallet(3, 'Archived Wallet')
        vi.mocked(getLimits).mockResolvedValue([])
        vi.mocked(getWalletsWithLimits).mockImplementation(async (isArchived) => isArchived ? [archived] : [])
        const wrapper = mountComponent()
        await flushPromises()
        expect(wrapper.text()).toContain('limits.copyFrom')
        expect(vi.mocked(getWalletsWithLimits)).toHaveBeenCalledWith(false)
        expect(vi.mocked(getWalletsWithLimits)).toHaveBeenCalledWith(true)
    })

    it('excludes the current wallet from the Copy From list', async () => {
        const current = makeWallet(1, 'Current Wallet')
        const other = makeWallet(2, 'Other Wallet')
        vi.mocked(getLimits).mockResolvedValue([])
        vi.mocked(getWalletsWithLimits).mockResolvedValue([current, other])
        const wrapper = mountComponent(current)
        await flushPromises()
        const items = getCopyItems(wrapper)
        expect(items).toHaveLength(1)
        expect(items[0].label).toBe('Other Wallet')
    })

    it('calls copyLimits with correct wallet IDs and hides Copy From after copy', async () => {
        const current = makeWallet(1, 'Current')
        const other = makeWallet(2, 'Other')
        vi.mocked(getLimits).mockResolvedValue([])
        vi.mocked(getWalletsWithLimits).mockResolvedValue([other])
        vi.mocked(copyLimits).mockResolvedValue([makeWalletLimit()])
        const wrapper = mountComponent(current)
        await flushPromises()
        expect(wrapper.text()).toContain('limits.copyFrom')

        getCopyItems(wrapper)[0].onSelect()
        await flushPromises()

        expect(vi.mocked(copyLimits)).toHaveBeenCalledWith(1, 2)
        expect(wrapper.text()).not.toContain('limits.copyFrom')
    })

    it('does not load wallets-with-limits when limits already exist', async () => {
        vi.mocked(getLimits).mockResolvedValue([makeWalletLimit()])
        mountComponent()
        await flushPromises()
        expect(vi.mocked(getWalletsWithLimits)).not.toHaveBeenCalled()
    })
})
