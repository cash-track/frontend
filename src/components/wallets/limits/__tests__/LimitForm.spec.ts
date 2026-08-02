import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { AxiosError } from 'axios'
import { Wallet } from '@/api/models/wallet'
import { Currency } from '@/api/models/currency'
import { Limit, LimitTagGroup } from '@/api/models/limit'
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

type TagGroupInput = { connection: 'and' | 'or'; tags: Tag[] }

function makeLimit(overrides: Partial<{ id: number; operation: '+' | '-'; amount: number; tagGroups: TagGroupInput[] }> = {}): Limit {
    return new Limit({
        id: overrides.id ?? 1,
        operation: overrides.operation ?? '-',
        amount: overrides.amount ?? 500,
        walletId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        tagGroups: (overrides.tagGroups ?? [{ connection: 'or', tags: [makeTag()] }]).map(g => new LimitTagGroup(g)),
        wallet: null,
    })
}

type LimitFormVm = {
    operation: '+' | '-'
    amount: number | null
    groups: TagGroupInput[]
    nextConnection: 'and' | 'or'
    onTagSelected: (tag: Tag) => void
    onTagRemoved: (tag: Tag) => void
    toggleConnection: () => void
    onCancel: () => void
    fieldErrors: Record<string, string[]>
    generalError: string | null
}

describe('LimitForm', () => {
    beforeEach(() => {
        mockCreateLimit.mockReset()
        mockUpdateLimit.mockReset()
    })

    it('defaults to a blank expense form when no edit prop is provided', () => {
        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as LimitFormVm
        expect(vm.operation).toBe('-')
        expect(vm.amount).toBeNull()
        expect(vm.groups).toHaveLength(0)
        expect(vm.nextConnection).toBe('or')
        expect(wrapper.find('form').exists()).toBe(true)
    })

    it('pre-fills operation, amount and tag groups from the edit prop', () => {
        const limit = makeLimit({ operation: '+', amount: 250 })
        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet(), edit: limit } })

        const vm = wrapper.vm as unknown as LimitFormVm
        expect(vm.operation).toBe('+')
        expect(vm.amount).toBe(250)
        expect(vm.groups).toHaveLength(1)
        expect(vm.groups[0].tags).toHaveLength(1)
    })

    it('pre-fills multiple groups (OR + AND) from edit.tagGroups without aliasing the source tags', () => {
        const shop = makeTag(1, 'Shop')
        const fuel = makeTag(2, 'Fuel')
        const medicine = makeTag(3, 'Medicine')
        const limit = makeLimit({
            tagGroups: [
                { connection: 'or', tags: [shop] },
                { connection: 'and', tags: [fuel, medicine] },
            ],
        })

        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet(), edit: limit } })
        const vm = wrapper.vm as unknown as LimitFormVm

        expect(vm.groups).toHaveLength(2)
        expect(vm.groups[0]).toEqual({ connection: 'or', tags: [shop] })
        expect(vm.groups[1].connection).toBe('and')
        expect(vm.groups[1].tags.map(t => t.id)).toEqual([2, 3])

        // form state must be a deep copy: mutating it must not affect the source Limit
        vm.groups[0].tags.push(fuel)
        expect(limit.tagGroups[0].tags).toHaveLength(1)
    })

    it('selecting tags under the default OR mode creates separate groups', () => {
        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as LimitFormVm
        const shop = makeTag(1, 'Shop')
        const coffee = makeTag(2, 'Coffee')

        expect(vm.nextConnection).toBe('or')
        vm.onTagSelected(shop)
        vm.onTagSelected(coffee)

        expect(vm.groups).toHaveLength(2)
        expect(vm.groups[0]).toEqual({ connection: 'or', tags: [shop] })
        expect(vm.groups[1]).toEqual({ connection: 'or', tags: [coffee] })
    })

    it('toggling to AND merges the next selected tag into the last group', () => {
        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as LimitFormVm
        const fuel = makeTag(1, 'Fuel')
        const medicine = makeTag(2, 'Medicine')

        vm.onTagSelected(fuel)
        vm.toggleConnection()
        expect(vm.nextConnection).toBe('and')
        vm.onTagSelected(medicine)

        expect(vm.groups).toHaveLength(1)
        expect(vm.groups[0].connection).toBe('and')
        expect(vm.groups[0].tags.map(t => t.id)).toEqual([1, 2])
    })

    it('does not add a duplicate tag id across groups', () => {
        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as LimitFormVm
        const shop = makeTag(1, 'Shop')

        vm.onTagSelected(shop)
        vm.onTagSelected(shop)

        expect(vm.groups).toHaveLength(1)
        expect(vm.groups[0].tags).toHaveLength(1)
    })

    it('removing the only tag in a group removes the group entirely', () => {
        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as LimitFormVm
        const shop = makeTag(1, 'Shop')
        const coffee = makeTag(2, 'Coffee')
        vm.onTagSelected(shop)
        vm.onTagSelected(coffee)
        expect(vm.groups).toHaveLength(2)

        vm.onTagRemoved(shop)

        expect(vm.groups).toHaveLength(1)
        expect(vm.groups[0].tags).toEqual([coffee])
    })

    it('removing one tag from an AND group demotes it back to a lone OR group', () => {
        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as LimitFormVm
        const fuel = makeTag(1, 'Fuel')
        const medicine = makeTag(2, 'Medicine')
        vm.onTagSelected(fuel)
        vm.toggleConnection()
        vm.onTagSelected(medicine)
        expect(vm.groups[0].connection).toBe('and')

        vm.onTagRemoved(medicine)

        expect(vm.groups).toHaveLength(1)
        expect(vm.groups[0].connection).toBe('or')
        expect(vm.groups[0].tags).toEqual([fuel])
    })

    it('calls createLimit with the entered amount, operation and tag groups on submit', async () => {
        const shop = makeTag(1, 'Shop')
        const fuel = makeTag(2, 'Fuel')
        const medicine = makeTag(3, 'Medicine')
        mockCreateLimit.mockResolvedValue(makeLimit())

        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as LimitFormVm
        vm.amount = 100
        vm.operation = '-'
        vm.onTagSelected(shop) // OR (default): starts group [Shop]
        vm.onTagSelected(fuel) // still OR: starts a new group [Fuel]
        vm.toggleConnection() // switch to AND before the next pick
        vm.onTagSelected(medicine) // AND: merges into the last group -> [Fuel, Medicine]

        await wrapper.find('form').trigger('submit')

        await vi.waitFor(() => {
            expect(mockCreateLimit).toHaveBeenCalledTimes(1)
        })

        const [walletId, request] = mockCreateLimit.mock.calls[0]
        expect(walletId).toBe(1)
        expect(request).toEqual({
            type: '-',
            amount: 100,
            tagGroups: [
                { operation: 'or', tags: [shop.id] },
                { operation: 'and', tags: [fuel.id, medicine.id] },
            ],
        })
    })

    it('emits created and resets the form after a successful create', async () => {
        const limit = makeLimit()
        mockCreateLimit.mockResolvedValue(limit)

        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as LimitFormVm
        vm.amount = 100
        vm.onTagSelected(makeTag())

        await wrapper.find('form').trigger('submit')

        await vi.waitFor(() => {
            expect(wrapper.emitted('created')).toBeTruthy()
        })
        expect(wrapper.emitted('created')![0]).toEqual([limit])
        expect(vm.amount).toBeNull()
        expect(vm.groups).toHaveLength(0)
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
        const vm = wrapper.vm as unknown as LimitFormVm
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
        const vm = wrapper.vm as unknown as LimitFormVm
        vm.amount = 100

        await wrapper.find('form').trigger('submit')

        await vi.waitFor(() => {
            expect(vm.generalError).toBe('Wallet is archived')
        })
        expect(vm.fieldErrors.walletId).toBeUndefined()
        expect(wrapper.findComponent({ name: 'LoadErrorAlert' }).exists()).toBe(false)
    })

    it('routes a 422 error for the tagGroups field into fieldErrors, not generalError', async () => {
        const axiosError = new AxiosError('Validation failed')
        axiosError.response = {
            status: 422,
            data: { errors: { tagGroups: ['At least one tag is required'] } },
            headers: {},
            config: {} as never,
            statusText: 'Unprocessable Entity',
        }
        mockCreateLimit.mockRejectedValue(axiosError)

        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as LimitFormVm
        vm.amount = 100

        await wrapper.find('form').trigger('submit')

        await vi.waitFor(() => {
            expect(vm.fieldErrors.tagGroups?.[0]).toBe('At least one tag is required')
        })
        expect(vm.generalError).toBeNull()
    })

    it('cancel resets the form and emits cancelled', async () => {
        const wrapper = shallowMount(LimitForm, { props: { wallet: makeWallet() } })
        const vm = wrapper.vm as unknown as LimitFormVm
        vm.amount = 42
        vm.onTagSelected(makeTag())
        vm.onCancel()

        expect(vm.amount).toBeNull()
        expect(vm.groups).toHaveLength(0)
        expect(wrapper.emitted('cancelled')).toBeTruthy()
    })
})
