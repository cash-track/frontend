import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { TooltipProvider } from 'reka-ui'
import { User } from '@/api/models/user'
import WalletSharedMember from '../WalletSharedMember.vue'

const { mockUnshareWallet } = vi.hoisted(() => ({
    mockUnshareWallet: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string, _args?: unknown[]) => key,
        locale: ref('en'),
    }),
}))

vi.mock('@/api/wallets', () => ({
    unshareWallet: mockUnshareWallet,
}))

vi.mock('@/composables/useNotifications', () => ({
    useNotifications: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}))

const globalStubs = {
    global: {
        stubs: {
            UAvatar: { template: '<img :alt="alt" />', props: ['src', 'alt', 'size'] },
            UButton: {
                template: '<button @click="$emit(\'click\')">btn</button>',
                props: ['loading', 'disabled', 'variant', 'color', 'icon', 'size', 'title'],
                emits: ['click'],
            },
        },
    },
}

const WrapperComponent = defineComponent({
    props: ['walletId', 'walletName', 'user', 'isAllowedToRemove'],
    emits: ['deleted'],
    setup(props, { emit }) {
        return () => h(TooltipProvider, null, {
            default: () => h(WalletSharedMember, {
                ...props,
                onDeleted: (userId: number) => emit('deleted', userId),
            }),
        })
    },
})

function makeUser(id = 1, name = 'Alice', lastName: string | null = 'Smith'): User {
    return new User({
        id, name, lastName, nickName: 'alice', photoUrl: null,
        email: 'alice@example.com', isEmailConfirmed: true, defaultCurrencyCode: null,
        defaultCurrency: null, locale: 'en', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-02'),
    })
}

describe('WalletSharedMember', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('renders user display name', () => {
        const wrapper = mount(WalletSharedMember, {
            props: { walletId: 1, walletName: 'Test', user: makeUser(), isAllowedToRemove: false },
            ...globalStubs,
        })
        expect(wrapper.text()).toContain('Alice Smith')
    })

    it('hides remove button when isAllowedToRemove is false', () => {
        const wrapper = mount(WalletSharedMember, {
            props: { walletId: 1, walletName: 'Test', user: makeUser(), isAllowedToRemove: false },
            ...globalStubs,
        })
        expect(wrapper.find('button').exists()).toBe(false)
    })

    it('shows remove button when isAllowedToRemove is true', () => {
        const wrapper = mount(WrapperComponent, {
            props: { walletId: 1, walletName: 'Test', user: makeUser(), isAllowedToRemove: true },
            ...globalStubs,
        })
        expect(wrapper.find('button').exists()).toBe(true)
    })

    it('emits deleted with userId after successful remove', async () => {
        mockUnshareWallet.mockResolvedValue(undefined)

        const wrapper = mount(WrapperComponent, {
            props: { walletId: 1, walletName: 'Test', user: makeUser(7), isAllowedToRemove: true },
            ...globalStubs,
        })

        await wrapper.find('button').trigger('click')
        await wrapper.vm.$nextTick()

        expect(mockUnshareWallet).toHaveBeenCalledWith(1, 7)
        expect(wrapper.emitted('deleted')).toBeTruthy()
        expect(wrapper.emitted('deleted')![0]).toEqual([7])
    })
})
