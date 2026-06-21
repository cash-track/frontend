import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Currency } from '@/api/models/currency'
import { Wallet } from '@/api/models/wallet'
import WalletsActiveShortList from '../WalletsActiveShortList.vue'

const mockActiveWallets = ref<Wallet[]>([])

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
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

function mountComponent(props: Record<string, unknown> = {}) {
    return mount(WalletsActiveShortList, {
        props,
        global: {
            plugins: [createPinia()],
            stubs: {
                RouterLink: {
                    name: 'RouterLink',
                    props: ['to'],
                    template: '<a class="router-link-stub"><slot /></a>',
                },
            },
        },
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

    it('renders formatted balance without fraction, char after, spaces for thousands', () => {
        mockActiveWallets.value = [makeWallet(1, 'Test Wallet', true, 1234.56)]
        const wrapper = mountComponent()
        // 1234.56 rounds to 1 235 $ (NBSP as thousands sep and before char)
        expect(wrapper.text()).toContain('1 235 $')
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

    it('renders chips as RouterLinks with correct to prop', () => {
        mockActiveWallets.value = [
            makeWallet(1, 'Savings'),
            makeWallet(2, 'Checking'),
        ]
        const wrapper = mountComponent()
        const links = wrapper.findAllComponents({ name: 'RouterLink' })
        expect(links).toHaveLength(2)
        expect(links[0].props('to')).toEqual({ name: 'wallets.show', params: { walletID: '1' } })
        expect(links[1].props('to')).toEqual({ name: 'wallets.show', params: { walletID: '2' } })
    })

    it('does not render plain buttons', () => {
        mockActiveWallets.value = [makeWallet(1, 'My Wallet')]
        const wrapper = mountComponent()
        expect(wrapper.findAll('button')).toHaveLength(0)
    })

    it('applies active-chip classes and aria-current when currentWalletId matches', () => {
        mockActiveWallets.value = [
            makeWallet(1, 'Savings'),
            makeWallet(2, 'Checking'),
        ]
        const wrapper = mountComponent({ currentWalletId: 2 })
        const links = wrapper.findAllComponents({ name: 'RouterLink' })
        expect(links).toHaveLength(2)

        // active chip: wallet id 2
        const activeLink = links[1]
        expect(activeLink.attributes('aria-current')).toBe('page')
        expect(activeLink.classes()).toContain('bg-elevated')
        expect(activeLink.classes()).toContain('font-semibold')

        // inactive chip: wallet id 1
        const inactiveLink = links[0]
        expect(inactiveLink.attributes('aria-current')).toBeUndefined()
        expect(inactiveLink.classes()).not.toContain('bg-elevated')
        expect(inactiveLink.classes()).not.toContain('font-semibold')
    })

    it('no chip has active classes when currentWalletId prop is absent', () => {
        mockActiveWallets.value = [
            makeWallet(1, 'Savings'),
            makeWallet(2, 'Checking'),
        ]
        const wrapper = mountComponent()
        const links = wrapper.findAllComponents({ name: 'RouterLink' })
        for (const link of links) {
            expect(link.attributes('aria-current')).toBeUndefined()
            expect(link.classes()).not.toContain('bg-elevated')
            expect(link.classes()).not.toContain('font-semibold')
        }
    })

    it('renders gradient fade element at the right edge', () => {
        mockActiveWallets.value = [makeWallet(1, 'Wallet')]
        const wrapper = mountComponent()
        const gradientDiv = wrapper.find('div.absolute')
        expect(gradientDiv.exists()).toBe(true)
        expect(gradientDiv.classes()).toContain('bg-gradient-to-r')
        expect(gradientDiv.classes()).toContain('from-transparent')
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
