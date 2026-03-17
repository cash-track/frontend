import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Currency } from '@/api/models/currency'
import { Wallet } from '@/api/models/wallet'
import WalletCard from '../WalletCard.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/stores/profile', () => ({
    useProfileStore: () => ({ profile: null }),
}))

const usd = new Currency({
    id: 'USD',
    code: 'USD',
    name: 'US Dollar',
    char: '$',
    rate: 1.0,
    updatedAt: new Date(),
})

function makeWallet(overrides: Partial<{
    isActive: boolean
    isArchived: boolean
    totalAmount: number
    name: string
}>): Wallet {
    return new Wallet({
        id: 1,
        name: overrides.name ?? 'Test Wallet',
        slug: 'test-wallet',
        totalAmount: overrides.totalAmount ?? 1234.56,
        isActive: overrides.isActive ?? false,
        isPublic: false,
        isArchived: overrides.isArchived ?? false,
        defaultCurrencyCode: 'USD',
        defaultCurrency: usd,
        createdAt: new Date(),
        updatedAt: new Date(),
        users: [],
        latestCharges: [],
    })
}

const globalStubs = {
    global: {
        stubs: {
            UBadge: { template: '<span><slot /></span>', props: ['color', 'variant'] },
            UAvatar: { template: '<div />', props: ['src', 'alt', 'size'] },
            UAvatarGroup: { template: '<div><slot /></div>', props: ['size'] },
            UIcon: { template: '<span />', props: ['name', 'class'] },
        },
    },
}

describe('WalletCard', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('renders wallet name', () => {
        const wallet = makeWallet({ name: 'My Savings' })
        const wrapper = mount(WalletCard, { props: { wallet }, ...globalStubs })
        expect(wrapper.text()).toContain('My Savings')
    })

    it('renders formatted balance', () => {
        const wallet = makeWallet({ totalAmount: 1234.56 })
        const wrapper = mount(WalletCard, { props: { wallet }, ...globalStubs })
        // Intl.NumberFormat formats 1234.56 USD as "$1,234.56" in en locale
        expect(wrapper.text()).toContain('1,234.56')
    })

    it('shows active badge when isActive is true', () => {
        const wallet = makeWallet({ isActive: true })
        const wrapper = mount(WalletCard, { props: { wallet }, ...globalStubs })
        expect(wrapper.text()).toContain('wallets.active')
    })

    it('does not show active badge when isActive is false', () => {
        const wallet = makeWallet({ isActive: false, isArchived: false })
        const wrapper = mount(WalletCard, { props: { wallet }, ...globalStubs })
        expect(wrapper.text()).not.toContain('wallets.active')
    })

    it('shows archived badge when isArchived is true', () => {
        const wallet = makeWallet({ isArchived: true })
        const wrapper = mount(WalletCard, { props: { wallet }, ...globalStubs })
        expect(wrapper.text()).toContain('wallets.archived')
    })
})
