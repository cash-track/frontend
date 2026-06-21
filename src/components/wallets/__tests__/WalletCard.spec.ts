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
    RouterLink: {
        name: 'RouterLink',
        props: ['to'],
        template: '<a class="router-link-stub" v-bind="$attrs"><slot /></a>',
    },
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
            RouterLink: {
                name: 'RouterLink',
                props: ['to'],
                template: '<a class="router-link-stub" v-bind="$attrs"><slot /></a>',
            },
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

    it('renders formatted balance without fraction, char after, spaces for thousands', () => {
        const wallet = makeWallet({ totalAmount: 1234.56 })
        const wrapper = mount(WalletCard, { props: { wallet }, ...globalStubs })
        // 1234.56 rounds to 1 235 $ (NBSP as thousands sep and before char)
        expect(wrapper.text()).toContain('1\u00A0235\u00A0$')
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

    it('shows disabled badge when isActive is false and isArchived is false', () => {
        const wallet = makeWallet({ isActive: false, isArchived: false })
        const wrapper = mount(WalletCard, { props: { wallet }, ...globalStubs })
        expect(wrapper.text()).toContain('wallets.disabled')
        expect(wrapper.text()).not.toContain('wallets.active')
        expect(wrapper.text()).not.toContain('wallets.archived')
    })

    it('card root is a RouterLink with correct to prop', () => {
        const wallet = makeWallet({ isActive: true })
        const wrapper = mount(WalletCard, { props: { wallet }, ...globalStubs })
        const link = wrapper.findComponent({ name: 'RouterLink' })
        expect(link.exists()).toBe(true)
        expect(link.props('to')).toEqual({ name: 'wallets.show', params: { walletID: '1' } })
    })

    it('root element has draggable="false"', () => {
        const wallet = makeWallet({ isActive: true })
        const wrapper = mount(WalletCard, { props: { wallet }, ...globalStubs })
        const link = wrapper.findComponent({ name: 'RouterLink' })
        expect(link.attributes('draggable')).toBe('false')
    })
})
