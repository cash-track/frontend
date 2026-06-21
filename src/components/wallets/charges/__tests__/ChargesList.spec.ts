import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Wallet } from '@/api/models/wallet'
import { Currency } from '@/api/models/currency'
import { Charge } from '@/api/models/charge'
import { Pagination } from '@/api/models/pagination'
import ChargesList from '../ChargesList.vue'

// jsdom does not implement IntersectionObserver — stub it globally
const observeSpy = vi.fn()
const disconnectSpy = vi.fn()
vi.stubGlobal('IntersectionObserver', class {
    observe = observeSpy
    unobserve = vi.fn()
    disconnect = disconnectSpy
    constructor(public cb: IntersectionObserverCallback) {}
})

const mockLocale = { value: 'en' }

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: mockLocale,
    }),
    createI18n: () => ({
        global: { t: (key: string) => key, locale: { value: 'en' }, setLocaleMessage: vi.fn() },
    }),
}))

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useRoute: () => ({ params: {} }),
}))

const mockGetCharges = vi.fn()
const mockMoveCharges = vi.fn()

vi.mock('@/api/charges', () => ({
    getCharges: (...args: unknown[]) => mockGetCharges(...args),
    moveCharges: (...args: unknown[]) => mockMoveCharges(...args),
}))

const usd = new Currency({
    id: 'USD',
    code: 'USD',
    name: 'US Dollar',
    char: '$',
    rate: 1.0,
    updatedAt: new Date(),
})

function makeWallet(id = 1): Wallet {
    return new Wallet({
        id,
        name: `Wallet ${id}`,
        slug: `wallet-${id}`,
        totalAmount: 1000,
        isActive: true,
        isPublic: false,
        isArchived: false,
        defaultCurrencyCode: 'USD',
        defaultCurrency: usd,
        createdAt: new Date(),
        updatedAt: new Date(),
        users: [],
        latestCharges: [],
    })
}

function makeCharge(id = 'charge-1', dateTime?: Date): Charge {
    return new Charge({
        id,
        operation: '-',
        amount: 42.50,
        title: 'Lunch',
        description: null,
        userId: 1,
        walletId: 1,
        dateTime: dateTime ?? new Date('2025-03-15T12:00:00'),
        createdAt: new Date('2025-03-15T12:00:00'),
        updatedAt: new Date('2025-03-15T12:00:00'),
        user: null,
        tags: [],
        wallet: null,
    })
}

function makeTodayCharge(id = 'charge-today'): Charge {
    const now = new Date()
    now.setHours(10, 0, 0, 0)
    return makeCharge(id, now)
}

function makePagination(): Pagination {
    return new Pagination({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
    })
}

describe('ChargesList', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockGetCharges.mockReset()
        mockMoveCharges.mockReset()
        mockGetCharges.mockResolvedValue({ data: [makeCharge()], pagination: makePagination() })
        mockLocale.value = 'en'
    })

    it('emits charges-moved after a successful move', async () => {
        mockMoveCharges.mockResolvedValue(undefined)

        const sourceWallet = makeWallet(1)
        const targetWallet = makeWallet(2)

        // Seed the wallets store so the move toolbar and target wallets are available
        const { useWalletsStore } = await import('@/stores/wallets')
        const store = useWalletsStore()
        store.activeWallets = [sourceWallet, targetWallet]

        const wrapper = shallowMount(ChargesList, {
            props: { wallet: sourceWallet },
        })

        // Wait for initial load
        await vi.waitFor(() => {
            expect(mockGetCharges).toHaveBeenCalledTimes(1)
        })

        // Select the charge via the exposed internal state
        const vm = wrapper.vm as unknown as { selectedCharges: Charge[] }
        vm.selectedCharges = [makeCharge()]

        // Trigger move
        const vmAny = wrapper.vm as unknown as { onMoveTo: (w: Wallet) => Promise<void> }
        await vmAny.onMoveTo(targetWallet)

        expect(mockMoveCharges).toHaveBeenCalledWith(
            sourceWallet.id,
            targetWallet.id,
            ['charge-1'],
        )

        const events = wrapper.emitted('charges-moved')
        expect(events).toBeTruthy()
        expect(events!.length).toBe(1)
    })

    it('does not emit charges-moved when moveCharges throws', async () => {
        mockMoveCharges.mockRejectedValue(new Error('network error'))

        const sourceWallet = makeWallet(1)
        const targetWallet = makeWallet(2)

        const { useWalletsStore } = await import('@/stores/wallets')
        const store = useWalletsStore()
        store.activeWallets = [sourceWallet, targetWallet]

        const wrapper = shallowMount(ChargesList, {
            props: { wallet: sourceWallet },
        })

        await vi.waitFor(() => {
            expect(mockGetCharges).toHaveBeenCalledTimes(1)
        })

        const vm = wrapper.vm as unknown as { selectedCharges: Charge[] }
        vm.selectedCharges = [makeCharge()]

        const vmAny = wrapper.vm as unknown as { onMoveTo: (w: Wallet) => Promise<void> }
        await vmAny.onMoveTo(targetWallet)

        const events = wrapper.emitted('charges-moved')
        expect(events).toBeFalsy()
    })

    it('renders a today header for charges dated today', async () => {
        const todayCharge = makeTodayCharge()
        mockGetCharges.mockResolvedValue({ data: [todayCharge], pagination: makePagination() })

        const wrapper = shallowMount(ChargesList, {
            props: { wallet: makeWallet(1) },
        })

        // Wait for the API call to complete, then flush the resulting Vue state update
        await vi.waitFor(() => {
            expect(mockGetCharges).toHaveBeenCalledTimes(1)
        })
        await nextTick()

        // With mocked t() returning the key itself, the today header should contain
        // 'charges.today' — confirming the group key and rendered label are set correctly.
        expect(wrapper.text()).toContain('charges.today')
    })

    it('onToggleGroup selects all charges in the today group', async () => {
        const todayCharge = makeTodayCharge('td-1')
        mockGetCharges.mockResolvedValue({ data: [todayCharge], pagination: makePagination() })

        const wrapper = shallowMount(ChargesList, {
            props: { wallet: makeWallet(1) },
        })

        await vi.waitFor(() => {
            expect(mockGetCharges).toHaveBeenCalledTimes(1)
        })

        const vm = wrapper.vm as unknown as {
            chargesGrouped: Map<string, Charge[]>
            selectedCharges: Charge[]
            onToggleGroup: (charges: Charge[]) => void
        }

        // Retrieve the today group from the computed map (key == 'charges.today' via mocked t)
        const todayGroup = vm.chargesGrouped.get('charges.today')
        expect(todayGroup).toBeTruthy()
        expect(todayGroup!.length).toBe(1)

        // Before toggle: nothing selected
        expect(vm.selectedCharges.length).toBe(0)

        vm.onToggleGroup(todayGroup!)

        // After first toggle: all in group selected
        expect(vm.selectedCharges.length).toBe(1)
        expect(vm.selectedCharges[0].id).toBe('td-1')

        vm.onToggleGroup(todayGroup!)

        // After second toggle: all deselected
        expect(vm.selectedCharges.length).toBe(0)
    })

    it('formats non-today group header with the app locale, not the browser locale', async () => {
        // A fixed past date: 2024-04-24 is a Wednesday in April
        const pastDate = new Date('2024-04-24T10:00:00')
        const pastCharge = makeCharge('past-1', pastDate)
        mockGetCharges.mockResolvedValue({ data: [pastCharge], pagination: makePagination() })

        mockLocale.value = 'uk'

        const wrapper = shallowMount(ChargesList, {
            props: { wallet: makeWallet(1) },
        })

        await vi.waitFor(() => {
            expect(mockGetCharges).toHaveBeenCalledTimes(1)
        })
        await nextTick()

        // Ukrainian month name for April is 'квітня'; the group header must contain it
        expect(wrapper.text()).toContain('квітня')
        // Must not use the English month name for the same date
        expect(wrapper.text()).not.toContain('April')
    })

    // UTooltip is registered internally as 'Tooltip'; shallowMount stubs it and
    // swallows slot content by default. Pass a slot-rendering stub so the button
    // inside the tooltip is visible in the DOM during tests.
    const tooltipStub = { template: '<span><slot /></span>', props: ['text', 'arrow'] }

    it('active wallet renders an explicit per-group select button', async () => {
        const todayCharge = makeTodayCharge()
        mockGetCharges.mockResolvedValue({ data: [todayCharge], pagination: makePagination() })

        const wrapper = shallowMount(ChargesList, {
            props: { wallet: makeWallet(1) },
            global: { stubs: { Tooltip: tooltipStub, UTooltip: tooltipStub } },
        })

        await vi.waitFor(() => expect(mockGetCharges).toHaveBeenCalledTimes(1))
        await nextTick()

        // The explicit select control: a <button> with the selectGroup aria-label
        const btn = wrapper.find('[aria-label="charges.selectGroup"]')
        expect(btn.exists()).toBe(true)
        expect(btn.element.tagName).toBe('BUTTON')
        // No legacy role="button" on the header div
        expect(wrapper.find('[role="button"]').exists()).toBe(false)
    })

    it('clicking the select-group control toggles the whole group', async () => {
        const todayCharge = makeTodayCharge('td-click')
        mockGetCharges.mockResolvedValue({ data: [todayCharge], pagination: makePagination() })

        const wrapper = shallowMount(ChargesList, {
            props: { wallet: makeWallet(1) },
            global: { stubs: { Tooltip: tooltipStub, UTooltip: tooltipStub } },
        })

        await vi.waitFor(() => expect(mockGetCharges).toHaveBeenCalledTimes(1))
        await nextTick()

        const vm = wrapper.vm as unknown as { selectedCharges: Charge[] }
        expect(vm.selectedCharges.length).toBe(0)

        const btn = wrapper.find('[aria-label="charges.selectGroup"]')
        expect(btn.exists()).toBe(true)

        await btn.trigger('click')
        expect(vm.selectedCharges.length).toBe(1)
        expect(vm.selectedCharges[0].id).toBe('td-click')

        await btn.trigger('click')
        expect(vm.selectedCharges.length).toBe(0)
    })

    it('aria-pressed on select-group button reflects selection state', async () => {
        const todayCharge = makeTodayCharge('td-pressed')
        mockGetCharges.mockResolvedValue({ data: [todayCharge], pagination: makePagination() })

        const wrapper = shallowMount(ChargesList, {
            props: { wallet: makeWallet(1) },
            global: { stubs: { Tooltip: tooltipStub, UTooltip: tooltipStub } },
        })

        await vi.waitFor(() => expect(mockGetCharges).toHaveBeenCalledTimes(1))
        await nextTick()

        const btn = wrapper.find('[aria-label="charges.selectGroup"]')
        expect(btn.attributes('aria-pressed')).toBe('false')

        await btn.trigger('click')
        expect(btn.attributes('aria-pressed')).toBe('true')
    })

    it('inactive wallet renders no select-group control', async () => {
        const inactiveWallet = new Wallet({
            id: 1,
            name: 'Wallet 1',
            slug: 'wallet-1',
            totalAmount: 0,
            isActive: false,
            isPublic: false,
            isArchived: true,
            defaultCurrencyCode: 'USD',
            defaultCurrency: usd,
            createdAt: new Date(),
            updatedAt: new Date(),
            users: [],
            latestCharges: [],
        })
        const charge = makeCharge('c-inactive', new Date('2024-01-01T10:00:00'))
        mockGetCharges.mockResolvedValue({ data: [charge], pagination: makePagination() })

        const wrapper = shallowMount(ChargesList, {
            props: { wallet: inactiveWallet },
        })

        await vi.waitFor(() => expect(mockGetCharges).toHaveBeenCalledTimes(1))
        await nextTick()

        // No select-group button for inactive wallets
        expect(wrapper.find('[aria-label="charges.selectGroup"]').exists()).toBe(false)
        // No role="button" either
        expect(wrapper.find('[role="button"]').exists()).toBe(false)
    })

    it('clears selectedCharges and removes moved charges from local list on success', async () => {
        mockMoveCharges.mockResolvedValue(undefined)

        const charge = makeCharge('c-1')
        mockGetCharges.mockResolvedValue({ data: [charge], pagination: makePagination() })

        const sourceWallet = makeWallet(1)
        const targetWallet = makeWallet(2)

        const { useWalletsStore } = await import('@/stores/wallets')
        const store = useWalletsStore()
        store.activeWallets = [sourceWallet, targetWallet]

        const wrapper = shallowMount(ChargesList, {
            props: { wallet: sourceWallet },
        })

        await vi.waitFor(() => {
            expect(mockGetCharges).toHaveBeenCalledTimes(1)
        })

        const vm = wrapper.vm as unknown as {
            selectedCharges: Charge[]
            charges: Charge[]
        }
        vm.selectedCharges = [charge]
        expect(vm.charges.length).toBe(1)

        const vmAny = wrapper.vm as unknown as { onMoveTo: (w: Wallet) => Promise<void> }
        await vmAny.onMoveTo(targetWallet)

        expect(vm.selectedCharges.length).toBe(0)
        expect(vm.charges.length).toBe(0)
    })

    it('shows retry button on load error and reloads charges on click', async () => {
        mockGetCharges.mockRejectedValue(new Error('network error'))

        const wrapper = shallowMount(ChargesList, {
            props: { wallet: makeWallet(1) },
        })

        // Wait for the failed load to settle then flush Vue state
        await vi.waitFor(() => {
            expect(mockGetCharges).toHaveBeenCalledTimes(1)
        })
        await nextTick()

        // Confirm the error ref is set on the VM
        const vm = wrapper.vm as unknown as { error: string | null; loadCharges: (page: number) => Promise<void> }
        expect(vm.error).toBeTruthy()

        // In shallowMount, UButton renders as <u-button-stub> — the wrapper div with
        // v-if="error && !loading" must be in the DOM
        const retryWrapper = wrapper.find('.flex.justify-center.mb-3')
        expect(retryWrapper.exists()).toBe(true)

        // Set up a successful response for the retry
        mockGetCharges.mockResolvedValue({ data: [makeCharge()], pagination: makePagination() })

        // Call loadCharges directly (equivalent to clicking the retry button)
        await vm.loadCharges(1)
        await nextTick()

        // getCharges must have been called a second time
        expect(mockGetCharges).toHaveBeenCalledTimes(2)

        // After successful reload the error should be cleared
        expect(vm.error).toBeNull()
    })
})
