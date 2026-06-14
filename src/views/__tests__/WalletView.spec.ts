import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import WalletView from '../WalletView.vue'
import { Wallet, WalletTotal } from '@/api/models/wallet'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
    createI18n: () => ({
        global: { t: (key: string) => key, locale: { value: 'en' }, setLocaleMessage: vi.fn() },
    }),
}))

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useRoute: () => ({ params: { walletID: '1' }, name: 'wallets.show' }),
}))

vi.mock('@/api/wallets', () => ({
    getWallet: vi.fn(),
    getWalletTotals: vi.fn(),
    getWalletUsers: vi.fn(),
}))

vi.mock('@/api/tags', () => ({
    getWalletTags: vi.fn(),
}))

vi.mock('@/stores/wallets', () => ({
    useWalletsStore: () => ({ loadActive: vi.fn() }),
}))

import { getWallet, getWalletTotals, getWalletUsers } from '@/api/wallets'
import { getWalletTags } from '@/api/tags'

function makeWallet(overrides: Partial<{ id: number; name: string; isActive: boolean }> = {}): Wallet {
    return new Wallet({
        id: overrides.id ?? 1,
        name: overrides.name ?? 'Test Wallet',
        slug: 'test-wallet',
        totalAmount: 0,
        isActive: overrides.isActive ?? true,
        isPublic: false,
        isArchived: false,
        defaultCurrencyCode: 'USD',
        defaultCurrency: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        users: [],
        latestCharges: [],
    })
}

function makeTotal(): WalletTotal {
    return new WalletTotal({
        totalAmount: 0,
        totalIncomeAmount: 0,
        totalExpenseAmount: 0,
        tags: [],
    })
}

async function flushAll() {
    await flushPromises()
    await nextTick()
}

const makeGlobal = (walletID = '1') => ({
    props: { walletID },
    global: {
        stubs: {
            WalletsActiveShortList: { template: '<div />' },
            WalletHeader: { template: '<div />', props: ['wallet', 'totals', 'users'] },
            ChargeCreate: { template: '<div />', props: ['wallet', 'walletTags'] },
            ChargesList: { template: '<div />', props: ['wallet', 'walletTags', 'filter'] },
            ChargesFilter: { template: '<div />' },
            ChargesFlowChart: { template: '<div />', props: ['walletId', 'currency', 'tags', 'dateFrom', 'dateTo'] },
            ChargesTotalChart: { template: '<div />', props: ['walletId', 'currency', 'walletTags', 'tags', 'dateFrom', 'dateTo'] },
            WalletLimitsTotal: { template: '<div />', props: ['wallet'] },
            MoneyAmount: { template: '<span />', props: ['amount', 'currency'] },
            TagChip: { template: '<span />', props: ['tag', 'highlighted', 'removable'] },
            Tag: { template: '<span />', props: ['tag', 'highlighted', 'removable'] },
            UButton: {
                template: '<button @click="$emit(\'click\')">{{ label }}</button>',
                props: ['label', 'icon', 'variant', 'color', 'size', 'loading', 'disabled'],
                emits: ['click'],
            },
            UAlert: { template: '<div data-testid="ualert" />', props: ['color', 'description', 'icon', 'class'] },
            Alert: { template: '<div data-testid="ualert" />', props: ['color', 'description', 'icon', 'class'] },
            UIcon: { template: '<span />', props: ['name', 'class'] },
            Icon: { template: '<span />', props: ['name', 'class'] },
            USkeleton: { template: '<div />', props: ['class'] },
            UCollapsible: {
                template: '<div><slot name="content" /></div>',
                props: ['open', 'unmountOnHide'],
            },
            Collapsible: {
                template: '<div><slot name="content" /></div>',
                props: ['open', 'unmountOnHide'],
            },
        },
    },
})

describe('WalletView.vue', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.mocked(getWallet).mockResolvedValue(makeWallet())
        vi.mocked(getWalletTotals).mockResolvedValue(makeTotal())
        vi.mocked(getWalletUsers).mockResolvedValue([])
        vi.mocked(getWalletTags).mockResolvedValue([])
    })

    it('loads and renders wallet content on mount', async () => {
        const wrapper = mount(WalletView, makeGlobal())
        await flushAll()

        const vm = wrapper.vm as unknown as { wallet: Wallet | null; error: string | null }
        expect(vm.wallet).not.toBeNull()
        expect(vm.error).toBeNull()
    })

    it('resets all show* panels and filter on walletID switch', async () => {
        const wrapper = mount(WalletView, makeGlobal('1'))
        await flushAll()

        // Open all panels
        const vm = wrapper.vm as unknown as {
            showCreateForm: boolean
            showFilters: boolean
            showGraph: boolean
            showLimits: boolean
            showTags: boolean
            wallet: Wallet | null
        }
        vm.showCreateForm = true
        vm.showFilters = true
        vm.showGraph = true
        vm.showLimits = true
        vm.showTags = true

        // Prepare second wallet for the switch
        vi.mocked(getWallet).mockResolvedValue(makeWallet({ id: 2 }))

        // Switch wallet
        await wrapper.setProps({ walletID: '2' })
        await flushAll()

        expect(vm.showCreateForm).toBe(false)
        expect(vm.showFilters).toBe(false)
        expect(vm.showGraph).toBe(false)
        expect(vm.showLimits).toBe(false)
        expect(vm.showTags).toBe(false)
    })

    it('clears wallet and sets error when loadWallet fails', async () => {
        vi.mocked(getWallet).mockRejectedValue(new Error('network error'))

        const wrapper = mount(WalletView, makeGlobal())
        await flushAll()

        const vm = wrapper.vm as unknown as { wallet: Wallet | null; error: string | null }
        expect(vm.wallet).toBeNull()
        expect(vm.error).toBe('wallets.loadingError')
    })

    it('shows full-error UAlert and no wallet content when load fails', async () => {
        vi.mocked(getWallet).mockRejectedValue(new Error('network error'))

        const wrapper = mount(WalletView, makeGlobal())
        await flushAll()

        // The full-page error alert (v-else-if="error && !wallet") must render
        const alerts = wrapper.findAll('[data-testid="ualert"]')
        expect(alerts.length).toBeGreaterThan(0)

        // WalletHeader is inside v-else-if="wallet" — must NOT be present
        const { WalletHeader } = makeGlobal().global.stubs as Record<string, unknown>
        expect(wrapper.findComponent(WalletHeader as Parameters<typeof wrapper.findComponent>[0]).exists()).toBe(false)
    })

    it('clears wallet on switch-to-failing wallet', async () => {
        // First load succeeds
        const wrapper = mount(WalletView, makeGlobal('1'))
        await flushAll()

        const vm = wrapper.vm as unknown as { wallet: Wallet | null; error: string | null }
        expect(vm.wallet).not.toBeNull()

        // Switch to a wallet that fails to load
        vi.mocked(getWallet).mockRejectedValue(new Error('not found'))
        await wrapper.setProps({ walletID: '99' })
        await flushAll()

        expect(vm.wallet).toBeNull()
        expect(vm.error).toBe('wallets.loadingError')
    })
})
