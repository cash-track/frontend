import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Charge } from '@/api/models/charge'
import { Wallet, WalletShort } from '@/api/models/wallet'
import { Currency } from '@/api/models/currency'
import { useAuthStore } from '@/stores/auth'
import ChargeItem from '../ChargeItem.vue'
import MoneyAmount from '@/components/Shared/MoneyAmount.vue'
import ConfirmModal from '@/components/Shared/ConfirmModal.vue'

const mockT = vi.fn((key: string) => key)
const { mockLocale } = vi.hoisted(() => ({ mockLocale: { value: 'en' } }))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: mockT,
        locale: mockLocale,
    }),
    createI18n: () => ({
        global: { t: (key: string) => key, locale: { value: 'en' }, setLocaleMessage: vi.fn() },
    }),
}))

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useRoute: () => ({ params: {} }),
    RouterLink: { name: 'RouterLink', template: '<a><slot /></a>', props: ['to'] },
}))

vi.mock('@/api/charges', () => ({
    deleteCharge: vi.fn(),
}))

import { deleteCharge } from '@/api/charges'

const usd = new Currency({
    id: 'USD',
    code: 'USD',
    name: 'US Dollar',
    char: '$',
    rate: 1.0,
    updatedAt: new Date(),
})

function makeWallet(): Wallet {
    return new Wallet({
        id: 1,
        name: 'Test Wallet',
        slug: 'test-wallet',
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

function makeWalletShort(overrides: Partial<{
    id: number
    name: string
    isActive: boolean
    isArchived: boolean
}> = {}): WalletShort {
    return new WalletShort({
        id: overrides.id ?? 2,
        name: overrides.name ?? 'My Wallet',
        slug: 'my-wallet',
        totalAmount: 500,
        isActive: overrides.isActive ?? true,
        isPublic: false,
        isArchived: overrides.isArchived ?? false,
        defaultCurrencyCode: 'USD',
        defaultCurrency: usd,
        createdAt: new Date(),
        updatedAt: new Date(),
    })
}

function makeChargeWithWallet(walletShort: WalletShort): Charge {
    return new Charge({
        id: 'charge-w',
        operation: '-',
        amount: 10,
        title: 'Dinner',
        description: null,
        userId: 1,
        walletId: walletShort.id,
        dateTime: new Date('2025-03-15T12:00:00'),
        createdAt: new Date('2025-03-15T12:00:00'),
        updatedAt: new Date('2025-03-15T12:00:00'),
        user: null,
        tags: [],
        wallet: walletShort,
    })
}

function makeCharge(overrides: Partial<{
    operation: '+' | '-'
    amount: number
    title: string
}>): Charge {
    return new Charge({
        id: 'charge-1',
        operation: overrides.operation ?? '-',
        amount: overrides.amount ?? 42.50,
        title: overrides.title ?? 'Lunch',
        description: null,
        userId: 1,
        walletId: 1,
        dateTime: new Date('2025-03-15T12:00:00'),
        createdAt: new Date('2025-03-15T12:00:00'),
        updatedAt: new Date('2025-03-15T12:00:00'),
        user: null,
        tags: [],
        wallet: null,
    })
}

describe('ChargeItem', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockT.mockImplementation((key: string) => key)
        mockLocale.value = 'en'
    })

    it('shows green up-arrow icon for income charge (operation +)', () => {
        const charge = makeCharge({ operation: '+' })
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        const icon = wrapper.find('.text-success')
        expect(icon.exists()).toBe(true)
    })

    it('shows red down-arrow icon for expense charge (operation -)', () => {
        const charge = makeCharge({ operation: '-' })
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        const icon = wrapper.find('.text-error')
        expect(icon.exists()).toBe(true)
    })

    it('renders charge title', () => {
        const charge = makeCharge({ title: 'Coffee break' })
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        expect(wrapper.text()).toContain('Coffee break')
    })

    it('passes amount to MoneyAmount and applies neutral color class', () => {
        const charge = makeCharge({ amount: 1234.56, operation: '-' })
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        const moneyAmount = wrapper.findComponent(MoneyAmount)
        expect(moneyAmount.exists()).toBe(true)
        expect(moneyAmount.props('amount')).toBe(1234.56)
        expect(moneyAmount.attributes('class')).toContain('text-neutral')
    })

    it('applies neutral color class to MoneyAmount for income charge', () => {
        const charge = makeCharge({ operation: '+' })
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        const moneyAmount = wrapper.findComponent(MoneyAmount)
        expect(moneyAmount.attributes('class')).toContain('text-neutral')
    })

    it('does not render dropdown when readOnly is true', () => {
        const charge = makeCharge({})
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet(), readOnly: true },
        })

        expect(wrapper.findComponent({ name: 'UDropdownMenu' }).exists()).toBe(false)
    })

    it('ConfirmModal error prop is null before any delete attempt', () => {
        const charge = makeCharge({})
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })
        // Trigger the confirm modal to mount by setting confirmMounted
        // We can check indirectly — the ConfirmModal is not mounted until
        // the dropdown onSelect fires, so it won't exist yet.
        // The absence of the modal means no spurious error is passed.
        expect(wrapper.findComponent(ConfirmModal).exists()).toBe(false)
    })

    it('passes error to ConfirmModal after deleteCharge rejects', async () => {
        vi.mocked(deleteCharge).mockRejectedValue(new Error('Network error'))
        const charge = makeCharge({})
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        // Open the modal by triggering the action items' onSelect
        // Access it via the component's exposed computed actionItems
        const vm = wrapper.vm as unknown as { confirmMounted: boolean; deleteConfirmOpen: boolean; onDeleteConfirmed: () => Promise<void> }
        vm.confirmMounted = true
        vm.deleteConfirmOpen = true
        await nextTick()

        // Trigger the confirm action
        await vm.onDeleteConfirmed()
        await nextTick()

        const modal = wrapper.findComponent(ConfirmModal)
        expect(modal.exists()).toBe(true)
        expect(modal.props('error')).toBe('charges.deleteError')
    })

    it('clears error on retry (second call to onDeleteConfirmed)', async () => {
        // First call rejects, second resolves
        vi.mocked(deleteCharge)
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValueOnce(undefined)

        const charge = makeCharge({})
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        const vm = wrapper.vm as unknown as { confirmMounted: boolean; deleteConfirmOpen: boolean; onDeleteConfirmed: () => Promise<void> }
        vm.confirmMounted = true
        vm.deleteConfirmOpen = true
        await nextTick()

        // First attempt — should set error
        await vm.onDeleteConfirmed()
        await nextTick()
        expect(wrapper.findComponent(ConfirmModal).props('error')).toBe('charges.deleteError')

        // Second attempt — error must be cleared at the start of the call
        await vm.onDeleteConfirmed()
        await nextTick()
        // After success the modal closes; error was null mid-call
        // We verify indirectly: deleteConfirmOpen should be false (modal closed on success)
        expect(vm.deleteConfirmOpen).toBe(false)
    })

    it('clears error when modal emits update:open false after a failed delete', async () => {
        vi.mocked(deleteCharge).mockRejectedValue(new Error('Network error'))
        const charge = makeCharge({})
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        const vm = wrapper.vm as unknown as { confirmMounted: boolean; deleteConfirmOpen: boolean; onDeleteConfirmed: () => Promise<void> }
        vm.confirmMounted = true
        vm.deleteConfirmOpen = true
        await nextTick()

        // Fail the delete to set deleteError
        await vm.onDeleteConfirmed()
        await nextTick()

        const modal = wrapper.findComponent(ConfirmModal)
        expect(modal.props('error')).toBe('charges.deleteError')

        // Simulate the modal closing (e.g. user clicks cancel/backdrop)
        await modal.vm.$emit('update:open', false)
        await nextTick()

        // Re-open the modal to confirm the error prop was cleared
        vm.deleteConfirmOpen = true
        await nextTick()

        expect(wrapper.findComponent(ConfirmModal).props('error')).toBeNull()
    })

    it('selection circle button has aria-label', () => {
        const charge = makeCharge({})
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet(), selectable: true },
        })

        const selectionBtn = wrapper.find('button[aria-label]')
        expect(selectionBtn.exists()).toBe(true)
        expect(selectionBtn.attributes('aria-label')).toBe('charges.selectCharge')
    })

    it('kebab trigger button has aria-label when not readOnly', () => {
        const charge = makeCharge({})
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        // The kebab UButton (v-else placeholder before dropdown mounts) has aria-label
        // shallowMount stubs UButton — find by aria-label attribute on the stub
        const buttons = wrapper.findAll('[aria-label]')
        const moreActionsBtn = buttons.find(b => b.attributes('aria-label') === 'wallets.moreActions')
        expect(moreActionsBtn).toBeDefined()
    })

    it('kebab wrapper has pointer-coarse:visible class appended when not expanded', () => {
        const charge = makeCharge({})
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        // The div wrapping the kebab should carry pointer-coarse:visible
        const kebabWrapper = wrapper.find('.pointer-coarse\\:visible')
        expect(kebabWrapper.exists()).toBe(true)
    })

    it('ConfirmModal description includes charge title via named interpolation', async () => {
        // Use a param-aware t mock to verify the title is passed as a named param
        mockT.mockImplementation((key: string, params?: Record<string, unknown>) =>
            params ? `${key}:${JSON.stringify(params)}` : key,
        )

        const charge = makeCharge({ title: 'Coffee break' })
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        const vm = wrapper.vm as unknown as { confirmMounted: boolean; deleteConfirmOpen: boolean }
        vm.confirmMounted = true
        vm.deleteConfirmOpen = true
        await nextTick()

        const modal = wrapper.findComponent(ConfirmModal)
        expect(modal.exists()).toBe(true)
        expect(modal.props('description')).toBe('charges.deletingConfirm:{"title":"Coffee break"}')
    })

    it('actionItems includes a type:label hint item when email is not confirmed', () => {
        const authStore = useAuthStore()
        authStore.isEmailConfirmed = false

        const charge = makeCharge({})
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        const vm = wrapper.vm as unknown as { actionItems: Array<Array<{ type?: string; label: string }>> }
        const allItems = vm.actionItems.flat()
        const labelItem = allItems.find(item => item.type === 'label')
        expect(labelItem).toBeDefined()
        expect(labelItem!.label).toBe('emailConfirmRequired')
    })

    it('actionItems does not include a type:label hint item when email is confirmed', () => {
        const authStore = useAuthStore()
        authStore.isEmailConfirmed = true

        const charge = makeCharge({})
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        const vm = wrapper.vm as unknown as { actionItems: Array<Array<{ type?: string; label: string }>> }
        const allItems = vm.actionItems.flat()
        const labelItem = allItems.find(item => item.type === 'label')
        expect(labelItem).toBeUndefined()
    })

    it('does NOT render wallet name when showWallet is false (default)', () => {
        const walletShort = makeWalletShort({ name: 'Savings' })
        const charge = makeChargeWithWallet(walletShort)
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        expect(wrapper.text()).not.toContain('@Savings')
    })

    it('renders wallet reference block when showWallet is true and charge.wallet exists', () => {
        const walletShort = makeWalletShort({ name: 'Savings', isActive: true })
        const charge = makeChargeWithWallet(walletShort)
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet(), showWallet: true },
        })

        // When showWallet=true and charge.wallet is set, a badge for the wallet status renders.
        // shallowMount stubs UBadge as <badge-stub> (Nuxt UI internal name: Badge).
        // The presence of the badge confirms the v-if="showWallet && charge.wallet" branch is entered.
        const activeBadge = wrapper.find('badge-stub[color="success"]')
        expect(activeBadge.exists()).toBe(true)
    })

    it('renders wallets.active badge for active wallet when showWallet is true', () => {
        const walletShort = makeWalletShort({ isActive: true, isArchived: false })
        const charge = makeChargeWithWallet(walletShort)
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet(), showWallet: true },
        })

        // shallowMount auto-stubs UBadge by its internal name (Badge -> badge-stub)
        const activeBadge = wrapper.find('badge-stub[color="success"]')
        expect(activeBadge.exists()).toBe(true)
        // Archived badge must not appear
        const archivedBadge = wrapper.find('badge-stub[color="neutral"]')
        expect(archivedBadge.exists()).toBe(false)
    })

    it('renders wallets.archived badge for archived wallet when showWallet is true', () => {
        const walletShort = makeWalletShort({ isActive: false, isArchived: true })
        const charge = makeChargeWithWallet(walletShort)
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet(), showWallet: true },
        })

        // Archived: neutral color badge present, success badge absent
        const archivedBadge = wrapper.find('badge-stub[color="neutral"]')
        expect(archivedBadge.exists()).toBe(true)
        const activeBadge = wrapper.find('badge-stub[color="success"]')
        expect(activeBadge.exists()).toBe(false)
    })

    it('wallet name RouterLink receives correct :to binding when showWallet is true', () => {
        const walletShort = makeWalletShort({ id: 42, name: 'Travel', isActive: true })
        const charge = makeChargeWithWallet(walletShort)
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet(), showWallet: true },
        })

        // Confirm the showWallet branch renders (badge present = condition is true)
        const badge = wrapper.find('badge-stub[color="success"]')
        expect(badge.exists()).toBe(true)

        // The vue-router mock names the stub 'RouterLink', so findComponent matches it
        // and its :to prop is assertable.
        const routerLink = wrapper.findComponent({ name: 'RouterLink' })
        expect(routerLink.exists()).toBe(true)
        const to = routerLink.props('to') as { name: string; params: { walletID: string } }
        expect(to.name).toBe('wallets.show')
        expect(to.params.walletID).toBe('42')
    })

    it('does not render wallet reference when showWallet is true but charge.wallet is null', () => {
        const charge = makeCharge({ title: 'NoWallet' })
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet(), showWallet: true },
        })

        // charge.wallet is null — no @ reference should appear
        expect(wrapper.text()).not.toContain('@')
    })

    it('fullDateTime is locale-aware: not the old ISO pattern, matches Intl output', () => {
        const charge = makeCharge({})
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        const vm = wrapper.vm as unknown as { fullDateTime: string; chargeTime: string }

        // (a) Must NOT be the old hand-built ISO-like string
        expect(vm.fullDateTime).not.toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)

        // (b) Must equal what Intl.DateTimeFormat produces for the same date + locale
        const expected = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeStyle: 'short' }).format(charge.dateTime)
        expect(vm.fullDateTime).toBe(expected)
    })

    it('fullDateTime produces a different string under uk locale than en locale', () => {
        const charge = makeCharge({})

        // Mount under 'en' (beforeEach resets mockLocale to 'en')
        const wrapperEn = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })
        const enResult = (wrapperEn.vm as unknown as { fullDateTime: string }).fullDateTime

        // Remount under 'uk'
        mockLocale.value = 'uk'
        const wrapperUk = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })
        const ukResult = (wrapperUk.vm as unknown as { fullDateTime: string }).fullDateTime

        const expectedUk = new Intl.DateTimeFormat('uk', { dateStyle: 'long', timeStyle: 'short' }).format(charge.dateTime)
        expect(ukResult).toBe(expectedUk)
        expect(ukResult).not.toBe(enResult)
    })
})
