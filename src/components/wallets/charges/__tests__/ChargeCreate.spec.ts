import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Wallet } from '@/api/models/wallet'
import { Currency } from '@/api/models/currency'
import { Charge } from '@/api/models/charge'
import ChargeCreate from '../ChargeCreate.vue'

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

const mockCreateCharge = vi.fn()
vi.mock('@/api/charges', () => ({
    createCharge: (...args: unknown[]) => mockCreateCharge(...args),
    getChargeTitles: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/api/tags', () => ({
    getWalletTags: vi.fn().mockResolvedValue([]),
    searchWalletTags: vi.fn().mockResolvedValue([]),
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

function makeCharge(amount: number): Charge {
    return new Charge({
        id: 'new-charge',
        operation: '-',
        amount,
        title: 'Test',
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

describe('ChargeCreate', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockCreateCharge.mockReset()
    })

    it('calls createCharge with the entered amount', async () => {
        mockCreateCharge.mockResolvedValue(makeCharge(50))

        const wrapper = shallowMount(ChargeCreate, {
            props: { wallet: makeWallet() },
        })

        // Access the component's internal state via vm
        const vm = wrapper.vm as unknown as { amount: number | null; title: string }
        vm.amount = 50
        vm.title = 'Test charge'

        await wrapper.find('form').trigger('submit')

        await vi.waitFor(() => {
            expect(mockCreateCharge).toHaveBeenCalledTimes(1)
        })

        const callArgs = mockCreateCharge.mock.calls[0]
        expect(callArgs[0]).toBe(1) // walletId
        expect(callArgs[1].amount).toBe(50)
        expect(callArgs[1].type).toBe('-') // default is expense
    })

    it('emits charge-created after successful submission', async () => {
        const charge = makeCharge(50)
        mockCreateCharge.mockResolvedValue(charge)

        const wrapper = shallowMount(ChargeCreate, {
            props: { wallet: makeWallet() },
        })

        const vm = wrapper.vm as unknown as { amount: number | null; title: string }
        vm.amount = 50
        vm.title = 'Test charge'

        await wrapper.find('form').trigger('submit')

        await vi.waitFor(() => {
            const events = wrapper.emitted('charge-created')
            expect(events).toBeTruthy()
            expect(events![0][0]).toEqual(charge)
        })
    })

    it('defaults to expense operation (-)', () => {
        const wrapper = shallowMount(ChargeCreate, {
            props: { wallet: makeWallet() },
        })

        const vm = wrapper.vm as unknown as { operation: string }
        expect(vm.operation).toBe('-')
    })
})
