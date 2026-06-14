import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Wallet } from '@/api/models/wallet'
import { User } from '@/api/models/user'
import { Currency } from '@/api/models/currency'
import WalletShare from '../WalletShare.vue'

const {
    mockGetWalletUsers,
    mockFindUsersByCommonWallets,
    mockShareWallet,
    mockNotifyError,
} = vi.hoisted(() => ({
    mockGetWalletUsers: vi.fn(),
    mockFindUsersByCommonWallets: vi.fn(),
    mockShareWallet: vi.fn(),
    mockNotifyError: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

vi.mock('@/api/wallets', () => ({
    getWalletUsers: mockGetWalletUsers,
    shareWallet: mockShareWallet,
}))

vi.mock('@/api/users', () => ({
    findUserByEmail: vi.fn(),
    findUsersByCommonWallets: mockFindUsersByCommonWallets,
}))

vi.mock('@/composables/useNotifications', () => ({
    useNotifications: () => ({ notifyError: mockNotifyError }),
}))

vi.mock('@/composables/useApiErrors', () => ({
    useApiErrors: () => ({
        fieldErrors: ref({}),
        handleError: vi.fn(),
        reset: vi.fn(),
    }),
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
            UButton: { template: '<button @click="$emit(\'click\')">btn</button>', props: ['label', 'loading', 'disabled', 'variant', 'size'], emits: ['click'] },
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

    it('onInvite shows shareInviteError toast on failure', async () => {
        mockShareWallet.mockRejectedValue(new Error('fail'))

        const wrapper = mount(WalletShare, {
            props: { wallet: makeWallet() },
            ...globalStubs,
        })

        const vm = wrapper.vm as unknown as { onInvite: (user: User) => Promise<void> }
        await vm.onInvite(makeUser())

        expect(mockNotifyError).toHaveBeenCalledWith('wallets.shareInviteError')
        expect(mockNotifyError).not.toHaveBeenCalledWith('wallets.shareMembersLoadingError')
    })

    it('onInvite does not show error toast on success', async () => {
        mockShareWallet.mockResolvedValue(undefined)

        const wrapper = mount(WalletShare, {
            props: { wallet: makeWallet() },
            ...globalStubs,
        })

        const vm = wrapper.vm as unknown as { onInvite: (user: User) => Promise<void> }
        await vm.onInvite(makeUser())

        expect(mockNotifyError).not.toHaveBeenCalled()
    })
})
