import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Charge } from '@/api/models/charge'
import { Wallet } from '@/api/models/wallet'
import { Currency } from '@/api/models/currency'
import ChargeItem from '../ChargeItem.vue'
import MoneyAmount from '@/components/Shared/MoneyAmount.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useRoute: () => ({ params: {} }),
}))

vi.mock('@/api/charges', () => ({
    deleteCharge: vi.fn(),
}))

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

    it('passes amount to MoneyAmount and applies expense color class', () => {
        const charge = makeCharge({ amount: 1234.56, operation: '-' })
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        const moneyAmount = wrapper.findComponent(MoneyAmount)
        expect(moneyAmount.exists()).toBe(true)
        expect(moneyAmount.props('amount')).toBe(1234.56)
        expect(moneyAmount.attributes('class')).toContain('text-error')
    })

    it('applies income color class to MoneyAmount for income charge', () => {
        const charge = makeCharge({ operation: '+' })
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet() },
        })

        const moneyAmount = wrapper.findComponent(MoneyAmount)
        expect(moneyAmount.attributes('class')).toContain('text-success')
    })

    it('does not render dropdown when readOnly is true', () => {
        const charge = makeCharge({})
        const wrapper = shallowMount(ChargeItem, {
            props: { charge, wallet: makeWallet(), readOnly: true },
        })

        expect(wrapper.findComponent({ name: 'UDropdownMenu' }).exists()).toBe(false)
    })
})
