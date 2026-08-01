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

    it('shows the move error alert on failure and clears it when the alert is dismissed', async () => {
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

        const vm = wrapper.vm as unknown as {
            selectedCharges: Charge[]
            moveError: string | null
            onMoveTo: (w: Wallet) => Promise<void>
        }
        vm.selectedCharges = [makeCharge()]

        await vm.onMoveTo(targetWallet)
        await nextTick()

        expect(vm.moveError).toBe('charges.moveError')

        // Nuxt UI v4.10's UAlert emits `update:open` (not `close`) when its close
        // button is pressed — the alert must clear moveError on that event.
        const alert = wrapper.findComponent({ name: 'Alert' })
        expect(alert.exists()).toBe(true)

        await alert.vm.$emit('update:open', false)
        await nextTick()

        expect(vm.moveError).toBeNull()
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

    it('group header draws the timeline connector while the select control is hidden', async () => {
        const todayCharge = makeTodayCharge('td-connector')
        mockGetCharges.mockResolvedValue({ data: [todayCharge], pagination: makePagination() })

        const wrapper = shallowMount(ChargesList, {
            props: { wallet: makeWallet(1) },
            global: { stubs: { Tooltip: tooltipStub, UTooltip: tooltipStub } },
        })

        await vi.waitFor(() => expect(mockGetCharges).toHaveBeenCalledTimes(1))
        await nextTick()

        // One connector per group header, so the timeline reads as one unbroken line
        const connector = wrapper.find('div.absolute.w-px')
        expect(connector.exists()).toBe(true)
        // It yields to the select control exactly when that control appears
        expect(connector.classes()).toContain('group-hover:invisible')
        expect(connector.classes()).toContain('pointer-coarse:invisible')

        // Selecting the group pins the control visible, so the connector gives way
        await wrapper.find('[aria-label="charges.selectGroup"]').trigger('click')
        await nextTick()

        expect(wrapper.find('div.absolute.w-px').exists()).toBe(false)
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
        // The decorative dash stands in for the control, so no vertical connector here
        expect(wrapper.find('div.absolute.w-px').exists()).toBe(false)
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

    it('shows LoadErrorAlert with retryable on load error and reloads charges when retry is emitted', async () => {
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

        // In shallowMount, LoadErrorAlert renders as a stub — v-if="error && !loading" must be in the DOM
        const alert = wrapper.findComponent({ name: 'LoadErrorAlert' })
        expect(alert.exists()).toBe(true)
        expect(alert.props('retryable')).toBe(true)

        // Set up a successful response for the retry
        mockGetCharges.mockResolvedValue({ data: [makeCharge()], pagination: makePagination() })

        // Emit retry (equivalent to clicking the LoadErrorAlert's retry action)
        await alert.vm.$emit('retry')
        await nextTick()

        // getCharges must have been called a second time
        expect(mockGetCharges).toHaveBeenCalledTimes(2)

        // After successful reload the error should be cleared
        expect(vm.error).toBeNull()
    })

    // The create-charge entry point is a static top-level row, never part of a day group
    describe('static create row (issue #111)', () => {
        // shallowMount's auto-stub swallows slot content, so both stubs render slots
        const collapsibleStub = {
            name: 'Collapsible',
            template: '<div><slot v-if="open" name="content" /></div>',
            props: ['open', 'unmountOnHide', 'ui'],
        }
        const buttonStub = {
            name: 'Button',
            template: '<button @click="$emit(\'click\')"><slot /></button>',
            props: ['variant', 'color', 'size', 'icon'],
            emits: ['click'],
        }
        const stubs = {
            UCollapsible: collapsibleStub,
            Collapsible: collapsibleStub,
            UButton: buttonStub,
            Button: buttonStub,
        }

        it('renders the create row for an active wallet, before the first group header', async () => {
            const todayCharge = makeTodayCharge()
            mockGetCharges.mockResolvedValue({ data: [todayCharge], pagination: makePagination() })

            const wrapper = shallowMount(ChargesList, {
                props: { wallet: makeWallet(1) },
                global: { stubs },
            })

            await vi.waitFor(() => expect(mockGetCharges).toHaveBeenCalledTimes(1))
            await nextTick()

            const text = wrapper.text()
            const createIndex = text.indexOf('charges.new')
            const groupIndex = text.indexOf('charges.today')
            expect(createIndex).toBeGreaterThanOrEqual(0)
            expect(groupIndex).toBeGreaterThanOrEqual(0)
            expect(createIndex).toBeLessThan(groupIndex)

            // The "+" icon button is decorative — hidden from the accessibility tree
            expect(wrapper.find('button[aria-hidden="true"]').exists()).toBe(true)
        })

        it('stays visible and clickable while charges are loading, unblurred and uncovered by the loading overlay', async () => {
            // A never-resolving promise keeps `loading` true
            let resolveGetCharges: (value: { data: Charge[]; pagination: Pagination }) => void = () => {}
            mockGetCharges.mockReturnValue(new Promise((resolve) => {
                resolveGetCharges = resolve
            }))

            const wrapper = shallowMount(ChargesList, {
                props: { wallet: makeWallet(1) },
                global: { stubs },
            })
            await nextTick()

            expect(wrapper.text()).toContain('charges.loading')

            // The create row stays clickable under the overlay
            const label = wrapper.findAll('button').find(b => b.text() === 'charges.new')
            expect(label).toBeTruthy()
            await label!.trigger('click')
            await nextTick()

            const vm = wrapper.vm as unknown as { isCreateOpen: boolean }
            expect(vm.isCreateOpen).toBe(true)

            // The overlay's positioning context must not contain the create row
            const overlay = wrapper.find('.absolute.inset-0.z-10')
            expect(overlay.exists()).toBe(true)
            const relativeAncestor = overlay.element.closest('.relative')
            expect(relativeAncestor).toBeTruthy()
            const createRow = wrapper.find('button[aria-hidden="true"]').element.closest('.group.flex.items-stretch')
            expect(createRow).toBeTruthy()
            expect(relativeAncestor!.contains(createRow!)).toBe(false)

            // Settle the pending fetch so it doesn't leak into other tests
            resolveGetCharges({ data: [], pagination: makePagination() })
            await nextTick()
        })

        it('does not render the create row for an inactive wallet', async () => {
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
            mockGetCharges.mockResolvedValue({ data: [makeCharge('c-inactive')], pagination: makePagination() })

            const wrapper = shallowMount(ChargesList, {
                props: { wallet: inactiveWallet },
                global: { stubs },
            })

            await vi.waitFor(() => expect(mockGetCharges).toHaveBeenCalledTimes(1))
            await nextTick()

            expect(wrapper.find('button[aria-hidden="true"]').exists()).toBe(false)
            expect(wrapper.text()).not.toContain('charges.new')
        })

        it('opens the inline ChargeCreate form on click and keeps the button visible', async () => {
            mockGetCharges.mockResolvedValue({ data: [makeCharge()], pagination: makePagination() })

            const wrapper = shallowMount(ChargesList, {
                props: { wallet: makeWallet(1) },
                global: { stubs },
            })

            await vi.waitFor(() => expect(mockGetCharges).toHaveBeenCalledTimes(1))
            await nextTick()

            expect(wrapper.findComponent({ name: 'ChargeCreate' }).exists()).toBe(false)

            const label = wrapper.findAll('button').find(b => b.text() === 'charges.new')
            expect(label).toBeTruthy()
            await label!.trigger('click')
            await nextTick()

            const vm = wrapper.vm as unknown as { isCreateOpen: boolean }
            expect(vm.isCreateOpen).toBe(true)
            expect(wrapper.findComponent({ name: 'ChargeCreate' }).exists()).toBe(true)
            // The button stays visible alongside the open form and toggles it shut.
            const stillThere = wrapper.findAll('button').find(b => b.text() === 'charges.new')
            expect(stillThere).toBeTruthy()

            await stillThere!.trigger('click')
            await nextTick()

            expect(vm.isCreateOpen).toBe(false)
            expect(wrapper.findComponent({ name: 'ChargeCreate' }).exists()).toBe(false)
            expect(wrapper.findAll('button').some(b => b.text() === 'charges.new')).toBe(true)
        })

        it('inserts the created charge, closes the form, and emits charge-created', async () => {
            mockGetCharges.mockResolvedValue({ data: [makeCharge('c-existing')], pagination: makePagination() })

            const wrapper = shallowMount(ChargesList, {
                props: { wallet: makeWallet(1) },
                global: { stubs },
            })

            await vi.waitFor(() => expect(mockGetCharges).toHaveBeenCalledTimes(1))
            await nextTick()

            const vm = wrapper.vm as unknown as { isCreateOpen: boolean; charges: Charge[] }
            vm.isCreateOpen = true
            await nextTick()

            const chargeCreate = wrapper.findComponent({ name: 'ChargeCreate' })
            expect(chargeCreate.exists()).toBe(true)

            const newCharge = makeCharge('c-new', new Date('2030-01-01T00:00:00'))
            await chargeCreate.vm.$emit('charge-created', newCharge)

            expect(vm.charges.some(c => c.id === 'c-new')).toBe(true)
            expect(vm.isCreateOpen).toBe(false)
            const events = wrapper.emitted('charge-created')
            expect(events).toBeTruthy()
            expect(events![0]).toEqual([newCharge])
        })

        it('closes the form when ChargeCreate emits cancelled', async () => {
            mockGetCharges.mockResolvedValue({ data: [makeCharge()], pagination: makePagination() })

            const wrapper = shallowMount(ChargesList, {
                props: { wallet: makeWallet(1) },
                global: { stubs },
            })

            await vi.waitFor(() => expect(mockGetCharges).toHaveBeenCalledTimes(1))
            await nextTick()

            const vm = wrapper.vm as unknown as { isCreateOpen: boolean }
            vm.isCreateOpen = true
            await nextTick()

            const chargeCreate = wrapper.findComponent({ name: 'ChargeCreate' })
            await chargeCreate.vm.$emit('cancelled')

            expect(vm.isCreateOpen).toBe(false)
        })

        it('relays dropdown-open-change into the collapsible overflow-visible override, resetting on close', async () => {
            mockGetCharges.mockResolvedValue({ data: [makeCharge()], pagination: makePagination() })

            const wrapper = shallowMount(ChargesList, {
                props: { wallet: makeWallet(1) },
                global: { stubs },
            })

            await vi.waitFor(() => expect(mockGetCharges).toHaveBeenCalledTimes(1))
            await nextTick()

            const vm = wrapper.vm as unknown as { isCreateOpen: boolean }
            vm.isCreateOpen = true
            await nextTick()

            const collapsible = wrapper.findComponent({ name: 'Collapsible' })
            expect(collapsible.exists()).toBe(true)
            expect(collapsible.props('ui')).toEqual({ content: '' })

            const chargeCreate = wrapper.findComponent({ name: 'ChargeCreate' })
            await chargeCreate.vm.$emit('dropdown-open-change', true)
            await nextTick()
            expect(collapsible.props('ui')).toEqual({ content: 'overflow-visible' })

            // Closing the form resets the override on its own
            vm.isCreateOpen = false
            await nextTick()
            expect(wrapper.findComponent({ name: 'Collapsible' }).props('ui')).toEqual({ content: '' })
        })

        it('closes the create form when the wallet switches', async () => {
            mockGetCharges.mockResolvedValue({ data: [makeCharge()], pagination: makePagination() })

            const wrapper = shallowMount(ChargesList, {
                props: { wallet: makeWallet(1) },
                global: { stubs },
            })

            await vi.waitFor(() => expect(mockGetCharges).toHaveBeenCalledTimes(1))
            await nextTick()

            const vm = wrapper.vm as unknown as { isCreateOpen: boolean }
            vm.isCreateOpen = true
            await nextTick()
            expect(vm.isCreateOpen).toBe(true)

            mockGetCharges.mockResolvedValue({ data: [], pagination: makePagination() })
            await wrapper.setProps({ wallet: makeWallet(2) })
            await vi.waitFor(() => expect(mockGetCharges).toHaveBeenCalledTimes(2))
            await nextTick()

            expect(vm.isCreateOpen).toBe(false)
        })
    })
})
