import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Wallet } from '@/api/models/wallet'
import { Currency } from '@/api/models/currency'
import { Charge } from '@/api/models/charge'
import { useAuthStore } from '@/stores/auth'
import ChargeEdit from '../ChargeEdit.vue'

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
    useRoute: () => ({ params: {} }),
}))

const mockUpdateCharge = vi.fn()
vi.mock('@/api/charges', () => ({
    updateCharge: (...args: unknown[]) => mockUpdateCharge(...args),
    getChargeTitles: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/api/tags', () => ({
    getWalletTags: vi.fn().mockResolvedValue([]),
    searchWalletTags: vi.fn().mockResolvedValue([]),
    getTagSuggestions: vi.fn().mockResolvedValue([]),
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

function makeCharge(): Charge {
    return new Charge({
        id: 'edit-charge-1',
        operation: '-',
        amount: 100,
        title: 'Groceries',
        description: null,
        userId: 1,
        walletId: 1,
        dateTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        user: null,
        tags: [],
        wallet: null,
    })
}

const tooltipStub = {
    template: '<span :data-tip="text" :data-tip-disabled="String(disabled)"><slot /></span>',
    props: ['text', 'arrow', 'disabled'],
}

describe('ChargeEdit', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockUpdateCharge.mockReset()
    })

    it('shows LoadErrorAlert (no retry) and no plain UAlert for a non-422 updateCharge failure', async () => {
        mockUpdateCharge.mockRejectedValue(new Error('network error'))

        const wrapper = shallowMount(ChargeEdit, {
            props: { wallet: makeWallet(), charge: makeCharge() },
        })

        await wrapper.find('form').trigger('submit')

        await vi.waitFor(() => {
            expect(wrapper.findComponent({ name: 'LoadErrorAlert' }).exists()).toBe(true)
        })

        const alert = wrapper.findComponent({ name: 'LoadErrorAlert' })
        expect(alert.props('retryable')).toBeFalsy()
        expect(wrapper.findComponent({ name: 'UAlert' }).exists()).toBe(false)
    })

    it('submit button tooltip is active (data-tip-disabled=false) when email is not confirmed', () => {
        const authStore = useAuthStore()
        authStore.isEmailConfirmed = false

        const wrapper = shallowMount(ChargeEdit, {
            props: { wallet: makeWallet(), charge: makeCharge() },
            global: {
                stubs: { Tooltip: tooltipStub, UTooltip: tooltipStub },
            },
        })

        const tip = wrapper.find('[data-tip="emailConfirmRequired"]')
        expect(tip.exists()).toBe(true)
        expect(tip.attributes('data-tip-disabled')).toBe('false')
    })

    it('submit button tooltip is inactive (data-tip-disabled=true) when email is confirmed', () => {
        const authStore = useAuthStore()
        authStore.isEmailConfirmed = true

        const wrapper = shallowMount(ChargeEdit, {
            props: { wallet: makeWallet(), charge: makeCharge() },
            global: {
                stubs: { Tooltip: tooltipStub, UTooltip: tooltipStub },
            },
        })

        const tip = wrapper.find('[data-tip="emailConfirmRequired"]')
        expect(tip.exists()).toBe(true)
        expect(tip.attributes('data-tip-disabled')).toBe('true')
    })
})
