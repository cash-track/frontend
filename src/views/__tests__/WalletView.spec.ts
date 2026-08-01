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
            ChargesList: { name: 'ChargesList', template: '<div />', props: ['wallet', 'walletTags', 'filter'] },
            ChargesFilter: { template: '<div />' },
            ChargesFlowChart: { template: '<div />', props: ['walletId', 'currency', 'tags', 'dateFrom', 'dateTo'] },
            ChargesTotalChart: { template: '<div />', props: ['walletId', 'currency', 'walletTags', 'tags', 'dateFrom', 'dateTo'] },
            WalletLimitsTotal: {
                template: '<div />',
                props: ['wallet'],
                methods: { reload: () => {} },
            },
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
                props: ['open', 'unmountOnHide', 'ui'],
            },
            Collapsible: {
                template: '<div><slot name="content" /></div>',
                props: ['open', 'unmountOnHide', 'ui'],
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
            showFilters: boolean
            showGraph: boolean
            showLimits: boolean
            showTags: boolean
            wallet: Wallet | null
        }
        vm.showFilters = true
        vm.showGraph = true
        vm.showLimits = true
        vm.showTags = true

        // Prepare second wallet for the switch
        vi.mocked(getWallet).mockResolvedValue(makeWallet({ id: 2 }))

        // Switch wallet
        await wrapper.setProps({ walletID: '2' })
        await flushAll()

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

    it('shows a retryable LoadErrorAlert on load failure, and reloads on retry', async () => {
        vi.mocked(getWallet).mockRejectedValueOnce(new Error('network error'))

        const wrapper = mount(WalletView, makeGlobal())
        await flushAll()

        const alert = wrapper.findComponent({ name: 'LoadErrorAlert' })
        expect(alert.exists()).toBe(true)
        expect(alert.props('retryable')).toBe(true)

        vi.mocked(getWallet).mockResolvedValue(makeWallet())
        const callsBeforeRetry = vi.mocked(getWallet).mock.calls.length

        await alert.vm.$emit('retry')
        await flushAll()

        expect(vi.mocked(getWallet).mock.calls.length).toBe(callsBeforeRetry + 1)
        expect(wrapper.findComponent({ name: 'LoadErrorAlert' }).exists()).toBe(false)
        const vm = wrapper.vm as unknown as { wallet: Wallet | null; error: string | null }
        expect(vm.wallet).not.toBeNull()
        expect(vm.error).toBeNull()
    })

    // The create-charge entry point moved into ChargesList (issue #111) —
    // see ChargesList.spec.ts for the create-row behaviour.
    it('does not render its own New Charge toolbar button or ChargeCreate form (moved into ChargesList)', async () => {
        const wrapper = mount(WalletView, makeGlobal())
        await flushAll()

        expect(wrapper.findComponent({ name: 'ChargeCreate' }).exists()).toBe(false)

        // Tool buttons render as real <button> elements via the UButton stub.
        // Tags, Limits, Graph, Filters remain — no fifth "New Charge" button.
        expect(wrapper.findAll('button').length).toBe(4)
    })

    it('relays ChargesList\'s charge-created event into a totals/charts/limits/wallets-store refresh', async () => {
        const wrapper = mount(WalletView, makeGlobal())
        await flushAll()

        const callsBeforeCreate = vi.mocked(getWalletTotals).mock.calls.length

        const chargesList = wrapper.findComponent({ name: 'ChargesList' })
        expect(chargesList.exists()).toBe(true)
        await chargesList.vm.$emit('charge-created')
        await flushAll()

        expect(vi.mocked(getWalletTotals).mock.calls.length).toBe(callsBeforeCreate + 1)
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
