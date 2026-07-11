import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Wallet } from '@/api/models/wallet'
import { User } from '@/api/models/user'
import { Currency } from '@/api/models/currency'
import WalletShare from '../WalletShare.vue'

const {
    mockGetWalletUsers,
    mockFindUsersByCommonWallets,
    mockShareWallet,
    mockRouterPush,
} = vi.hoisted(() => ({
    mockGetWalletUsers: vi.fn(),
    mockFindUsersByCommonWallets: vi.fn(),
    mockShareWallet: vi.fn(),
    mockRouterPush: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mockRouterPush }),
    useRoute: () => ({ params: {}, query: {}, name: '' }),
    RouterLink: { template: '<a><slot /></a>' },
}))

vi.mock('@/api/wallets', () => ({
    getWalletUsers: mockGetWalletUsers,
    shareWallet: mockShareWallet,
}))

vi.mock('@/api/users', () => ({
    findUserByEmail: vi.fn(),
    findUsersByCommonWallets: mockFindUsersByCommonWallets,
}))

vi.mock('@/composables/useApiErrors', () => ({
    useApiErrors: () => {
        const fieldErrors = ref({})
        const generalError = ref<string | null>(null)
        const generalErrorRaw = ref<unknown>(null)
        return {
            fieldErrors,
            generalError,
            generalErrorRaw,
            handleError: vi.fn((err: unknown) => {
                generalError.value = 'unknownError'
                generalErrorRaw.value = err
            }),
            reset: vi.fn(() => {
                fieldErrors.value = {}
                generalError.value = null
                generalErrorRaw.value = null
            }),
        }
    },
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
        totalAmount: 0,
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

function makeUser(id = 2, name = 'Bob'): User {
    return new User({
        id, name, lastName: null, nickName: 'bob', photoUrl: null,
        email: 'bob@example.com', isEmailConfirmed: true, defaultCurrencyCode: null,
        defaultCurrency: null, locale: 'en', createdAt: new Date(), updatedAt: new Date(),
    })
}

const globalStubs = {
    global: {
        stubs: {
            UCard: { template: '<div><slot name="header" /><slot /></div>' },
            UAlert: { template: '<div data-testid="alert">{{ description }}</div>', props: ['color', 'description', 'icon'] },
            WalletSharedMember: { template: '<div />', props: ['walletId', 'walletName', 'user', 'isAllowedToRemove'], emits: ['deleted'] },
            USeparator: { template: '<hr />', props: ['label'] },
            UAvatar: { template: '<img :alt="alt" />', props: ['src', 'alt', 'size'] },
            UButton: { template: '<button :aria-label="ariaLabel" @click="$emit(\'click\')">btn</button>', props: ['label', 'loading', 'disabled', 'variant', 'size', 'icon', 'ariaLabel'], emits: ['click'] },
            UTooltip: { template: '<span><slot /></span>', props: ['text', 'arrow'] },
            Tooltip: { template: '<span><slot /></span>', props: ['text', 'arrow'] },
            UFormField: { template: '<div><slot /></div>', props: ['label', 'error'] },
            UInput: { template: '<input />', props: ['modelValue', 'type', 'placeholder', 'class', 'disabled'], emits: ['update:modelValue', 'keydown'] },
        },
    },
}

describe('WalletShare', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        mockGetWalletUsers.mockResolvedValue([])
        mockFindUsersByCommonWallets.mockResolvedValue([])
    })

    it('onInvite failure shows a single, specific non-retryable LoadErrorAlert (no toast)', async () => {
        mockShareWallet.mockRejectedValue(new Error('fail'))

        const wrapper = mount(WalletShare, {
            props: { wallet: makeWallet() },
            ...globalStubs,
        })

        const vm = wrapper.vm as unknown as { onInvite: (user: User) => Promise<void> }
        await vm.onInvite(makeUser())
        await wrapper.vm.$nextTick()

        // Specific invite-error message, not the generic unknownError fallback
        const alert = wrapper.findComponent({ name: 'LoadErrorAlert' })
        expect(alert.exists()).toBe(true)
        expect(alert.props('title')).toBe('wallets.shareInviteError')
        expect(alert.props('retryable')).toBeFalsy()
    })

    it('onInvite does not show any general-error alert on success', async () => {
        mockShareWallet.mockResolvedValue(undefined)

        const wrapper = mount(WalletShare, {
            props: { wallet: makeWallet() },
            ...globalStubs,
        })

        const vm = wrapper.vm as unknown as { onInvite: (user: User) => Promise<void> }
        await vm.onInvite(makeUser())
        await wrapper.vm.$nextTick()

        expect(wrapper.findComponent({ name: 'LoadErrorAlert' }).exists()).toBe(false)
    })

    it('clears a stale invite-error alert once a later invite on the same instance succeeds', async () => {
        mockShareWallet.mockRejectedValueOnce(new Error('fail'))

        const wrapper = mount(WalletShare, {
            props: { wallet: makeWallet() },
            ...globalStubs,
        })

        const vm = wrapper.vm as unknown as { onInvite: (user: User) => Promise<void> }
        await vm.onInvite(makeUser())
        await wrapper.vm.$nextTick()

        // Alert renders after the failure
        expect(wrapper.findComponent({ name: 'LoadErrorAlert' }).exists()).toBe(true)

        // Retry the invite — this time it succeeds
        mockShareWallet.mockResolvedValueOnce(undefined)
        await vm.onInvite(makeUser())
        await wrapper.vm.$nextTick()

        // Stale alert must not survive a subsequent successful invite
        expect(wrapper.findComponent({ name: 'LoadErrorAlert' }).exists()).toBe(false)
    })

    it('shows a retryable LoadErrorAlert when loading members fails, and reloads on retry', async () => {
        mockGetWalletUsers.mockReset()
        mockGetWalletUsers.mockRejectedValueOnce(new Error('load fail'))
        mockGetWalletUsers.mockResolvedValue([])

        const wrapper = mount(WalletShare, {
            props: { wallet: makeWallet() },
            ...globalStubs,
        })
        await flushPromises()

        const alerts = wrapper.findAllComponents({ name: 'LoadErrorAlert' })
        const loadAlert = alerts.find(a => a.props('retryable'))
        expect(loadAlert).toBeTruthy()

        await loadAlert!.vm.$emit('retry')
        await flushPromises()

        expect(mockGetWalletUsers).toHaveBeenCalledTimes(2)
        expect(wrapper.findAllComponents({ name: 'LoadErrorAlert' }).some(a => a.props('retryable'))).toBe(false)
    })

    it('close button navigates back to wallets.show', async () => {
        const wallet = makeWallet()
        const wrapper = mount(WalletShare, {
            props: { wallet },
            ...globalStubs,
        })

        const closeBtn = wrapper.find('button[aria-label="wallets.shareBack"]')
        expect(closeBtn.exists()).toBe(true)
        await closeBtn.trigger('click')

        expect(mockRouterPush).toHaveBeenCalledWith({
            name: 'wallets.show',
            params: { walletID: '1', nameForTitle: 'Test Wallet' },
        })
    })
})
