import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Currency } from '@/api/models/currency'
import { Wallet } from '@/api/models/wallet'
import WalletsActiveShortList from '../WalletsActiveShortList.vue'

const mockPush = vi.fn()
const mockActiveWallets = ref<Wallet[]>([])

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/stores/wallets', () => ({
    useWalletsStore: () => ({
        activeWallets: mockActiveWallets,
        loading: ref(false),
        failed: ref(false),
        loadActive: vi.fn(),
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

function makeWallet(id: number, name: string, isActive = true, totalAmount = 100): Wallet {
    return new Wallet({
        id,
        name,
        slug: name.toLowerCase().replace(/ /g, '-'),
        totalAmount,
        isActive,
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

function mountComponent() {
    return mount(WalletsActiveShortList, {
        global: { plugins: [createPinia()] },
    })
}

describe('WalletsActiveShortList', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        setActivePinia(createPinia())
        mockActiveWallets.value = []
    })

    it('is hidden when there are no active wallets', () => {
        mockActiveWallets.value = []
        const wrapper = mountComponent()
        expect(wrapper.find('div').exists()).toBe(false)
    })

    it('renders wallet names when there are active wallets', () => {
        mockActiveWallets.value = [
            makeWallet(1, 'Savings'),
            makeWallet(2, 'Checking'),
        ]
        const wrapper = mountComponent()
        expect(wrapper.text()).toContain('Savings')
        expect(wrapper.text()).toContain('Checking')
    })

    it('renders formatted balance for each wallet', () => {
        mockActiveWallets.value = [makeWallet(1, 'Test Wallet', true, 1234.56)]
        const wrapper = mountComponent()
        expect(wrapper.text()).toContain('1,234.56')
    })

    it('filters out inactive wallets', () => {
        mockActiveWallets.value = [
            makeWallet(1, 'Active Wallet', true),
            makeWallet(2, 'Inactive Wallet', false),
        ]
        const wrapper = mountComponent()
        expect(wrapper.text()).toContain('Active Wallet')
        expect(wrapper.text()).not.toContain('Inactive Wallet')
    })

    it('navigates to wallets.show on click', async () => {
        mockActiveWallets.value = [makeWallet(42, 'My Wallet')]
        const wrapper = mountComponent()
        const buttons = wrapper.findAll('button')
        expect(buttons).toHaveLength(1)
        await buttons[0].trigger('click')
        expect(mockPush).toHaveBeenCalledWith({
            name: 'wallets.show',
            params: { walletID: '42' },
        })
    })

    it('renders gradient fade element at the right edge', () => {
        mockActiveWallets.value = [makeWallet(1, 'Wallet')]
        const wrapper = mountComponent()
        // Gradient div is the absolute-positioned overlay using inline style
        const gradientDiv = wrapper.find('div.absolute')
        expect(gradientDiv.exists()).toBe(true)
        expect(gradientDiv.attributes('style')).toContain('linear-gradient')
    })

    it('shows total amount as string when no currency', () => {
        const wallet = new Wallet({
            id: 1,
            name: 'No Currency',
            slug: 'no-currency',
            totalAmount: 99,
            isActive: true,
            isPublic: false,
            isArchived: false,
            defaultCurrencyCode: null,
            defaultCurrency: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            users: [],
            latestCharges: [],
        })
        mockActiveWallets.value = [wallet]
        const wrapper = mountComponent()
        expect(wrapper.text()).toContain('99')
    })
})
