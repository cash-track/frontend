import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'
import WalletLimitItem from '../WalletLimitItem.vue'
import { WalletLimit, Limit } from '@/api/models/limit'
import { Wallet } from '@/api/models/wallet'
import { Currency } from '@/api/models/currency'
import { Tag } from '@/api/models/tag'

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

vi.mock('@/api/limits', () => ({
    deleteLimit: vi.fn(),
}))

const usd = new Currency({ id: 'USD', code: 'USD', name: 'US Dollar', char: '$', rate: 1, updatedAt: new Date() })

function makeWallet(): Wallet {
    return new Wallet({
        id: 1, name: 'Test', slug: 'test', totalAmount: 1000,
        isActive: true, isPublic: false, isArchived: false,
        defaultCurrencyCode: 'USD', defaultCurrency: usd,
        createdAt: new Date(), updatedAt: new Date(),
        users: [], latestCharges: [],
    })
}

function makeTag(): Tag {
    return new Tag({
        id: 1, name: 'Food', icon: null, color: '#ff0000',
        userId: 1, createdAt: new Date(), updatedAt: new Date(),
    })
}

function makeWalletLimit(percentage: number): WalletLimit {
    return new WalletLimit({
        amount: percentage * 100,
        percentage,
        limit: new Limit({
            id: 1, operation: '-', amount: 100, walletId: 1,
            createdAt: new Date(), updatedAt: new Date(),
            tags: [makeTag()], wallet: null,
        }),
    })
}

const stubs = {
    global: {
        stubs: {
            UIcon: true,
            UButton: true,
            UDropdownMenu: true,
            TagBadge: true,
            LimitForm: true,
        },
    },
}

describe('WalletLimitItem', () => {
    it('renders progress bar green (gray) when percentage <= 1', () => {
        const wrapper = shallowMount(WalletLimitItem, {
            ...stubs,
            props: { walletLimit: makeWalletLimit(0.5), wallet: makeWallet() },
        })
        const bar = wrapper.find('.bg-gray-400')
        expect(bar.exists()).toBe(true)
        const redBar = wrapper.find('.bg-red-500')
        expect(redBar.exists()).toBe(false)
    })

    it('renders progress bar red when percentage > 1 (exceeded)', () => {
        const wrapper = shallowMount(WalletLimitItem, {
            ...stubs,
            props: { walletLimit: makeWalletLimit(1.5), wallet: makeWallet() },
        })
        const redBar = wrapper.find('.bg-red-500')
        expect(redBar.exists()).toBe(true)
    })

    it('caps visual bar width at 100%', () => {
        const wrapper = shallowMount(WalletLimitItem, {
            ...stubs,
            props: { walletLimit: makeWalletLimit(1.5), wallet: makeWallet() },
        })
        const bar = wrapper.find('.bg-red-500')
        expect(bar.attributes('style')).toContain('width: 100%')
    })

    it('displays percentage text when percentage > 10%', () => {
        const wrapper = shallowMount(WalletLimitItem, {
            ...stubs,
            props: { walletLimit: makeWalletLimit(0.5), wallet: makeWallet() },
        })
        expect(wrapper.find('.text-xs').text()).toBe('50%')
    })
})
