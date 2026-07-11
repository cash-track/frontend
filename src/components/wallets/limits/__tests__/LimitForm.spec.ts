import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { AxiosError } from 'axios'
import { Wallet } from '@/api/models/wallet'
import { Currency } from '@/api/models/currency'
import { Limit } from '@/api/models/limit'
import { Tag } from '@/api/models/tag'
import LimitForm from '../LimitForm.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
    createI18n: () => ({
        global: { t: (key: string) => key, locale: { value: 'en' }, setLocaleMessage: vi.fn() },
    }),
}))

const mockCreateLimit = vi.fn()
const mockUpdateLimit = vi.fn()
vi.mock('@/api/limits', () => ({
    createLimit: (...args: unknown[]) => mockCreateLimit(...args),
    updateLimit: (...args: unknown[]) => mockUpdateLimit(...args),
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

function makeTag(id = 1, name = 'Food'): Tag {
    return new Tag({
        id, name, icon: null, color: null, userId: 1,
        createdAt: new Date(), updatedAt: new Date(),
    })
}

function makeLimit(overrides: Partial<{ id: number; operation: '+' | '-'; amount: number; tags: Tag[] }> = {}): Limit {
    return new Limit({
        id: overrides.id ?? 1,
        operation: overrides.operation ?? '-',
        amount: overrides.amount ?? 500,
        walletId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: overrides.tags ?? [makeTag()],
        wallet: null,
    })
}

describe('LimitForm', () => {
    beforeEach(() => {
        mockCreateLimit.mockReset()
        mockUpdateLimit.mockReset()
    })

    it('defaults to a blank expense form when no edit prop is provided', () => {
        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as { operation: '+' | '-'; amount: number | null; selectedTags: Tag[] }
        expect(vm.operation).toBe('-')
        expect(vm.amount).toBeNull()
        expect(vm.selectedTags).toHaveLength(0)
        expect(wrapper.find('form').exists()).toBe(true)
    })

    it('pre-fills operation, amount and tags from the edit prop', () => {
        const limit = makeLimit({ operation: '+', amount: 250 })
        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet(), edit: limit } })

        const vm = wrapper.vm as unknown as { operation: '+' | '-'; amount: number | null; selectedTags: Tag[] }
        expect(vm.operation).toBe('+')
        expect(vm.amount).toBe(250)
        expect(vm.selectedTags).toHaveLength(1)
    })

    it('calls createLimit with the entered amount, operation and tags on submit', async () => {
        const tag = makeTag()
        mockCreateLimit.mockResolvedValue(makeLimit({ tags: [tag] }))

        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as {
            amount: number | null
            operation: '+' | '-'
            selectedTags: Tag[]
        }
        vm.amount = 100
        vm.operation = '-'
        vm.selectedTags = [tag]

        await wrapper.find('form').trigger('submit')

        await vi.waitFor(() => {
            expect(mockCreateLimit).toHaveBeenCalledTimes(1)
        })

        const [walletId, request] = mockCreateLimit.mock.calls[0]
        expect(walletId).toBe(1)
        expect(request).toEqual({ type: '-', amount: 100, tags: [tag.id] })
    })

    it('emits created and resets the form after a successful create', async () => {
        const limit = makeLimit()
        mockCreateLimit.mockResolvedValue(limit)

        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as { amount: number | null }
        vm.amount = 100

        await wrapper.find('form').trigger('submit')

        await vi.waitFor(() => {
            expect(wrapper.emitted('created')).toBeTruthy()
        })
        expect(wrapper.emitted('created')![0]).toEqual([limit])
        expect(vm.amount).toBeNull()
    })

    it('calls updateLimit and emits updated in edit mode (form is not reset)', async () => {
        const limit = makeLimit({ id: 7 })
        const updated = makeLimit({ id: 7, amount: 999 })
        mockUpdateLimit.mockResolvedValue(updated)

        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet(), edit: limit } })
        await wrapper.find('form').trigger('submit')

        await vi.waitFor(() => {
            expect(mockUpdateLimit).toHaveBeenCalledWith(1, 7, expect.objectContaining({ amount: 500 }))
        })
        expect(wrapper.emitted('updated')![0]).toEqual([updated])
    })

    it('shows LoadErrorAlert (no retry) and no plain UAlert for a non-422 createLimit failure', async () => {
        mockCreateLimit.mockRejectedValue(new Error('network error'))

        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as { amount: number | null }
        vm.amount = 100

        await wrapper.find('form').trigger('submit')

        await vi.waitFor(() => {
            expect(wrapper.findComponent({ name: 'LoadErrorAlert' }).exists()).toBe(true)
        })

        const alert = wrapper.findComponent({ name: 'LoadErrorAlert' })
        expect(alert.props('retryable')).toBeFalsy()
        expect(wrapper.findComponent({ name: 'UAlert' }).exists()).toBe(false)
    })

    it('routes a 422 error for a field the form does not render into generalError, not LoadErrorAlert', async () => {
        const axiosError = new AxiosError('Validation failed')
        axiosError.response = {
            status: 422,
            data: { errors: { walletId: ['Wallet is archived'] } },
            headers: {},
            config: {} as never,
            statusText: 'Unprocessable Entity',
        }
        mockCreateLimit.mockRejectedValue(axiosError)

        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as {
            amount: number | null
            fieldErrors: Record<string, string[]>
            generalError: string | null
        }
        vm.amount = 100

        await wrapper.find('form').trigger('submit')

        await vi.waitFor(() => {
            expect(vm.generalError).toBe('Wallet is archived')
        })
        expect(vm.fieldErrors.walletId).toBeUndefined()
        expect(wrapper.findComponent({ name: 'LoadErrorAlert' }).exists()).toBe(false)
    })

    it('cancel resets the form and emits cancelled', async () => {
        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as {
            amount: number | null
            onCancel: () => void
        }
        vm.amount = 42
        vm.onCancel()

        expect(vm.amount).toBeNull()
        expect(wrapper.emitted('cancelled')).toBeTruthy()
    })
})
