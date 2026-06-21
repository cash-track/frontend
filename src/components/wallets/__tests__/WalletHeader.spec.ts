import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Wallet } from '@/api/models/wallet'
import { Currency } from '@/api/models/currency'
import WalletHeader from '../WalletHeader.vue'
import ConfirmModal from '@/components/Shared/ConfirmModal.vue'

const {
    mockActivateWallet,
    mockDisableWallet,
    mockArchiveWallet,
    mockUnarchiveWallet,
    mockDeleteWallet,
    mockNotifyError,
    mockRouterPush,
    mockIsEmailConfirmed,
} = vi.hoisted(() => ({
    mockActivateWallet: vi.fn(),
    mockDisableWallet: vi.fn(),
    mockArchiveWallet: vi.fn(),
    mockUnarchiveWallet: vi.fn(),
    mockDeleteWallet: vi.fn(),
    mockNotifyError: vi.fn(),
    mockRouterPush: vi.fn(),
    mockIsEmailConfirmed: { value: true },
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/stores/auth', () => ({
    useAuthStore: () => ({ isEmailConfirmed: mockIsEmailConfirmed.value }),
}))

vi.mock('@/api/wallets', () => ({
    activateWallet: mockActivateWallet,
    disableWallet: mockDisableWallet,
    archiveWallet: mockArchiveWallet,
    unarchiveWallet: mockUnarchiveWallet,
    deleteWallet: mockDeleteWallet,
}))

vi.mock('@/composables/useNotifications', () => ({
    useNotifications: () => ({ notifyError: mockNotifyError }),
}))

const usd = new Currency({
    id: 'USD',
    code: 'USD',
    name: 'US Dollar',
    char: '$',
    rate: 1.0,
    updatedAt: new Date(),
})

function makeWallet(overrides: { isActive?: boolean; isArchived?: boolean } = {}): Wallet {
    return new Wallet({
        id: 1,
        name: 'Test Wallet',
        slug: 'test-wallet',
        totalAmount: 1000,
        isActive: overrides.isActive ?? true,
        isPublic: false,
        isArchived: overrides.isArchived ?? false,
        defaultCurrencyCode: 'USD',
        defaultCurrency: usd,
        createdAt: new Date(),
        updatedAt: new Date(),
        users: [],
        latestCharges: [],
    })
}

describe('WalletHeader', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        mockIsEmailConfirmed.value = true
    })

    it('onActivate shows activateError toast on failure', async () => {
        mockActivateWallet.mockRejectedValue(new Error('fail'))
        const wallet = makeWallet({ isActive: false })
        const wrapper = shallowMount(WalletHeader, {
            props: { wallet, totals: null, users: [] },
        })
        const vm = wrapper.vm as unknown as { onActivate: () => Promise<void> }
        await vm.onActivate()
        expect(mockNotifyError).toHaveBeenCalledWith('wallets.activateError')
        expect(mockNotifyError).not.toHaveBeenCalledWith('wallets.loadingError')
    })

    it('onDisable shows disableError toast on failure', async () => {
        mockDisableWallet.mockRejectedValue(new Error('fail'))
        const wallet = makeWallet({ isActive: true })
        const wrapper = shallowMount(WalletHeader, {
            props: { wallet, totals: null, users: [] },
        })
        const vm = wrapper.vm as unknown as { onDisable: () => Promise<void> }
        await vm.onDisable()
        expect(mockNotifyError).toHaveBeenCalledWith('wallets.disableError')
    })

    it('onArchive shows archiveError toast on failure', async () => {
        mockArchiveWallet.mockRejectedValue(new Error('fail'))
        const wallet = makeWallet({ isArchived: false })
        const wrapper = shallowMount(WalletHeader, {
            props: { wallet, totals: null, users: [] },
        })
        const vm = wrapper.vm as unknown as { onArchive: () => Promise<void> }
        await vm.onArchive()
        expect(mockNotifyError).toHaveBeenCalledWith('wallets.archiveError')
    })

    it('onUnArchive shows unArchiveError toast on failure', async () => {
        mockUnarchiveWallet.mockRejectedValue(new Error('fail'))
        const wallet = makeWallet({ isArchived: true })
        const wrapper = shallowMount(WalletHeader, {
            props: { wallet, totals: null, users: [] },
        })
        const vm = wrapper.vm as unknown as { onUnArchive: () => Promise<void> }
        await vm.onUnArchive()
        expect(mockNotifyError).toHaveBeenCalledWith('wallets.unArchiveError')
    })

    it('onDeleteConfirmed surfaces deleteError via ConfirmModal error prop on failure', async () => {
        mockDeleteWallet.mockRejectedValue(new Error('fail'))
        const wallet = makeWallet()
        const wrapper = shallowMount(WalletHeader, {
            props: { wallet, totals: null, users: [] },
        })
        const vm = wrapper.vm as unknown as {
            deleteConfirmOpen: boolean
            onDeleteConfirmed: () => Promise<void>
        }
        vm.deleteConfirmOpen = true
        await nextTick()

        await vm.onDeleteConfirmed()
        await nextTick()

        const modal = wrapper.findComponent(ConfirmModal)
        expect(modal.exists()).toBe(true)
        expect(modal.props('error')).toBe('wallets.deleteError')
        // Delete failure must NOT produce a toast
        expect(mockNotifyError).not.toHaveBeenCalled()
    })

    it('onDeleteConfirmed clears deleteError at the start of each attempt', async () => {
        mockDeleteWallet
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValueOnce(undefined)

        const wallet = makeWallet()
        const wrapper = shallowMount(WalletHeader, {
            props: { wallet, totals: null, users: [] },
        })
        const vm = wrapper.vm as unknown as {
            deleteConfirmOpen: boolean
            onDeleteConfirmed: () => Promise<void>
        }
        vm.deleteConfirmOpen = true
        await nextTick()

        // First attempt — sets error
        await vm.onDeleteConfirmed()
        await nextTick()
        expect(wrapper.findComponent(ConfirmModal).props('error')).toBe('wallets.deleteError')

        // Second attempt — clears error, then succeeds and closes modal
        await vm.onDeleteConfirmed()
        await nextTick()
        expect(vm.deleteConfirmOpen).toBe(false)
    })

    it('deleteError clears when modal emits update:open false', async () => {
        mockDeleteWallet.mockRejectedValue(new Error('fail'))
        const wallet = makeWallet()
        const wrapper = shallowMount(WalletHeader, {
            props: { wallet, totals: null, users: [] },
        })
        const vm = wrapper.vm as unknown as {
            deleteConfirmOpen: boolean
            onDeleteConfirmed: () => Promise<void>
        }
        vm.deleteConfirmOpen = true
        await nextTick()

        await vm.onDeleteConfirmed()
        await nextTick()
        expect(wrapper.findComponent(ConfirmModal).props('error')).toBe('wallets.deleteError')

        // Simulate modal close
        await wrapper.findComponent(ConfirmModal).vm.$emit('update:open', false)
        await nextTick()

        // Re-open to verify error was cleared
        vm.deleteConfirmOpen = true
        await nextTick()
        expect(wrapper.findComponent(ConfirmModal).props('error')).toBeNull()
    })

    it('more-actions kebab UButton has aria-label set to wallets.moreActions key', () => {
        const wallet = makeWallet()
        const slotRenderingDropdown = {
            template: '<div class="dropdown-stub"><slot /></div>',
            props: ['items'],
        }
        const wrapper = shallowMount(WalletHeader, {
            props: { wallet, totals: null, users: [] },
            global: {
                stubs: {
                    // Nuxt UI registers UDropdownMenu internally as 'DropdownMenu'
                    UDropdownMenu: slotRenderingDropdown,
                    DropdownMenu: slotRenderingDropdown,
                },
            },
        })

        const html = wrapper.html()
        expect(html).toContain('aria-label="wallets.moreActions"')
    })

    it('Edit button tooltip is active (data-tip-disabled=false) when email is not confirmed', () => {
        mockIsEmailConfirmed.value = false
        const tooltipStub = {
            template: '<span :data-tip="text" :data-tip-disabled="String(disabled)"><slot /></span>',
            props: ['text', 'arrow', 'disabled'],
        }
        const wallet = makeWallet()
        const wrapper = shallowMount(WalletHeader, {
            props: { wallet, totals: null, users: [] },
            global: {
                stubs: { Tooltip: tooltipStub, UTooltip: tooltipStub },
            },
        })

        const tip = wrapper.find('[data-tip="emailConfirmRequired"]')
        expect(tip.exists()).toBe(true)
        expect(tip.attributes('data-tip-disabled')).toBe('false')
    })

    it('Edit button tooltip is inactive (data-tip-disabled=true) when email is confirmed', () => {
        mockIsEmailConfirmed.value = true
        const tooltipStub = {
            template: '<span :data-tip="text" :data-tip-disabled="String(disabled)"><slot /></span>',
            props: ['text', 'arrow', 'disabled'],
        }
        const wallet = makeWallet()
        const wrapper = shallowMount(WalletHeader, {
            props: { wallet, totals: null, users: [] },
            global: {
                stubs: { Tooltip: tooltipStub, UTooltip: tooltipStub },
            },
        })

        const tip = wrapper.find('[data-tip="emailConfirmRequired"]')
        expect(tip.exists()).toBe(true)
        expect(tip.attributes('data-tip-disabled')).toBe('true')
    })

    it('actionItems includes a type:label hint item when email is not confirmed', () => {
        mockIsEmailConfirmed.value = false
        const wallet = makeWallet()
        const wrapper = shallowMount(WalletHeader, {
            props: { wallet, totals: null, users: [] },
        })

        const vm = wrapper.vm as unknown as { actionItems: Array<Array<{ type?: string; label: string }>> }
        const allItems = vm.actionItems.flat()
        const labelItem = allItems.find(item => item.type === 'label')
        expect(labelItem).toBeDefined()
        expect(labelItem!.label).toBe('emailConfirmRequired')
    })

    it('actionItems does not include a type:label hint item when email is confirmed', () => {
        mockIsEmailConfirmed.value = true
        const wallet = makeWallet()
        const wrapper = shallowMount(WalletHeader, {
            props: { wallet, totals: null, users: [] },
        })

        const vm = wrapper.vm as unknown as { actionItems: Array<Array<{ type?: string; label: string }>> }
        const allItems = vm.actionItems.flat()
        const labelItem = allItems.find(item => item.type === 'label')
        expect(labelItem).toBeUndefined()
    })
})
