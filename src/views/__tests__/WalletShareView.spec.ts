import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import WalletShareView from '../WalletShareView.vue'
import { Wallet } from '@/api/models/wallet'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
    createI18n: () => ({
        global: { t: (key: string) => key, locale: { value: 'en' }, setLocaleMessage: vi.fn() },
    }),
}))

vi.mock('@/api/wallets', () => ({
    getWallet: vi.fn(),
}))

import { getWallet } from '@/api/wallets'

function makeWallet(id = 1): Wallet {
    return new Wallet({
        id,
        name: 'Test Wallet',
        slug: 'test-wallet',
        totalAmount: 0,
        isActive: true,
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

const globalStubs = {
    props: { walletID: '1' },
    global: {
        stubs: {
            WalletShare: { template: '<div class="wallet-share-stub" />', props: ['wallet'] },
            UIcon: true,
        },
    },
}

describe('WalletShareView.vue', () => {
    beforeEach(() => {
        vi.mocked(getWallet).mockReset()
    })

    it('renders WalletShare once the wallet loads', async () => {
        vi.mocked(getWallet).mockResolvedValue(makeWallet())

        const wrapper = mount(WalletShareView, globalStubs)
        await flushPromises()

        expect(wrapper.find('.wallet-share-stub').exists()).toBe(true)
        expect(wrapper.findComponent({ name: 'LoadErrorAlert' }).exists()).toBe(false)
    })

    it('shows a retryable LoadErrorAlert on load failure, and reloads on retry', async () => {
        vi.mocked(getWallet).mockRejectedValueOnce(new Error('network error'))

        const wrapper = mount(WalletShareView, globalStubs)
        await flushPromises()

        const alert = wrapper.findComponent({ name: 'LoadErrorAlert' })
        expect(alert.exists()).toBe(true)
        expect(alert.props('retryable')).toBe(true)
        expect(wrapper.find('.wallet-share-stub').exists()).toBe(false)

        vi.mocked(getWallet).mockResolvedValue(makeWallet())

        await alert.vm.$emit('retry')
        await flushPromises()

        expect(wrapper.findComponent({ name: 'LoadErrorAlert' }).exists()).toBe(false)
        expect(wrapper.find('.wallet-share-stub').exists()).toBe(true)
    })
})
