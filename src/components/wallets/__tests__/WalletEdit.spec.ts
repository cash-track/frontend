import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Currency } from '@/api/models/currency'
import { Wallet } from '@/api/models/wallet'
import WalletEdit from '../WalletEdit.vue'

const { mockUpdateWallet, mockDeleteWallet, mockLoadActive } = vi.hoisted(() => ({
    mockUpdateWallet: vi.fn(),
    mockDeleteWallet: vi.fn(),
    mockLoadActive: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useRoute: () => ({ params: {}, query: {}, name: '' }),
    RouterLink: { template: '<a><slot /></a>' },
}))

vi.mock('@/stores/wallets', () => ({
    useWalletsStore: () => ({ loadActive: mockLoadActive }),
}))

vi.mock('@/api/wallets', () => ({
    updateWallet: mockUpdateWallet,
    deleteWallet: mockDeleteWallet,
}))

vi.mock('@/api/currency', () => ({
    getFeaturedCurrencies: vi.fn().mockResolvedValue([
        { id: 'USD', code: 'USD', name: 'US Dollar', char: '$', rate: 1.0, updatedAt: new Date() },
    ]),
}))

vi.mock('@/composables/useNotifications', () => ({
    useNotifications: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}))

const globalStubs = {
    global: {
        stubs: {
            UCard: { template: '<div><slot name="header" /><slot /><slot name="footer" /></div>' },
            UFormField: { template: '<div><slot /></div>', props: ['label', 'error', 'required', 'description'] },
            UInput: { template: '<input />', props: ['modelValue', 'disabled', 'placeholder', 'class'], emits: ['update:modelValue'] },
            USelect: { template: '<select />', props: ['modelValue', 'items', 'disabled', 'class'], emits: ['update:modelValue'] },
            USwitch: { template: '<input type="checkbox" />', props: ['modelValue', 'disabled'], emits: ['update:modelValue'] },
            UButton: {
                template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
                props: ['label', 'loading', 'disabled', 'variant', 'color', 'icon', 'to'],
                emits: ['click'],
            },
            UAlert: { template: '<div><slot /></div>', props: ['color', 'description', 'icon'] },
            UModal: { template: '<div><slot name="body" /><slot name="footer" /></div>', props: ['open', 'title'] },
        },
    },
}

const usd = new Currency({ id: 'USD', code: 'USD', name: 'US Dollar', char: '$', rate: 1.0, updatedAt: new Date() })

function makeWallet(): Wallet {
    return new Wallet({
        id: 5,
        name: 'My Wallet',
        slug: 'my-wallet',
        totalAmount: 500,
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

describe('WalletEdit', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('renders edit wallet heading', () => {
        const wrapper = mount(WalletEdit, { props: { wallet: makeWallet() }, ...globalStubs })
        expect(wrapper.text()).toContain('wallets.editTitle')
    })

    it('pre-fills form with wallet name', () => {
        const wrapper = mount(WalletEdit, { props: { wallet: makeWallet() }, ...globalStubs })
        const vm = wrapper.vm as unknown as { form: { name: string } }
        expect(vm.form.name).toBe('My Wallet')
    })

    it('pre-fills form with wallet currency', () => {
        const wrapper = mount(WalletEdit, { props: { wallet: makeWallet() }, ...globalStubs })
        const vm = wrapper.vm as unknown as { form: { defaultCurrencyCode: string } }
        expect(vm.form.defaultCurrencyCode).toBe('USD')
    })

    it('delete button opens confirmation modal', async () => {
        const wrapper = mount(WalletEdit, { props: { wallet: makeWallet() }, ...globalStubs })

        const deleteBtn = wrapper.findAll('button').find(b => b.text().includes('wallets.delete'))
        expect(deleteBtn).toBeDefined()
        await deleteBtn!.trigger('click')

        const vm = wrapper.vm as unknown as { deleteConfirmOpen: boolean }
        expect(vm.deleteConfirmOpen).toBe(true)
    })

    it('calls updateWallet with form data on submit', async () => {
        mockUpdateWallet.mockResolvedValue({})
        mockLoadActive.mockResolvedValue(undefined)

        const wrapper = mount(WalletEdit, { props: { wallet: makeWallet() }, ...globalStubs })
        const vm = wrapper.vm as unknown as { onSubmit: () => Promise<void> }
        await vm.onSubmit()

        expect(mockUpdateWallet).toHaveBeenCalledWith(
            5,
            expect.objectContaining({ name: 'My Wallet', defaultCurrencyCode: 'USD' }),
        )
    })

    it('calls deleteWallet on confirmed delete', async () => {
        mockDeleteWallet.mockResolvedValue(undefined)
        mockLoadActive.mockResolvedValue(undefined)

        const wrapper = mount(WalletEdit, { props: { wallet: makeWallet() }, ...globalStubs })
        const vm = wrapper.vm as unknown as { onDelete: () => Promise<void> }
        await vm.onDelete()

        expect(mockDeleteWallet).toHaveBeenCalledWith(5)
    })
})
