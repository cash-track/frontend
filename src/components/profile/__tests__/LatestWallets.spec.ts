import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LatestWallets from '../LatestWallets.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (k: string) => k }),
}))

const mockGetLatestWallets = vi.fn()

vi.mock('@/api/profile', () => ({
    getLatestWallets: (...args: unknown[]) => mockGetLatestWallets(...args),
}))

vi.mock('@/components/wallets/WalletCard.vue', () => ({
    default: { template: '<div class="wallet-card" />', props: ['wallet'] },
}))

// LoadErrorAlert stub that emits retry on button click
const loadErrorAlertStub = {
    name: 'LoadErrorAlert',
    props: ['title', 'error', 'class'],
    emits: ['retry'],
    template: `
        <div class="load-error-alert-stub">
            <span class="load-error-title">{{ title }}</span>
            <button class="load-error-retry" @click="$emit('retry')">retry</button>
        </div>
    `,
}

function mountComponent() {
    return mount(LatestWallets, {
        global: {
            plugins: [createPinia()],
            stubs: {
                LoadErrorAlert: loadErrorAlertStub,
                USkeleton: { template: '<div class="u-skeleton" />' },
                Skeleton: { template: '<div class="u-skeleton" />' },
            },
        },
    })
}

describe('LatestWallets', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockGetLatestWallets.mockReset()
    })

    it('shows LoadErrorAlert when load fails', async () => {
        mockGetLatestWallets.mockRejectedValue(new Error('network fail'))
        const wrapper = mountComponent()
        await flushPromises()
        expect(wrapper.find('.load-error-alert-stub').exists()).toBe(true)
    })

    it('passes wallets.listLoadingError as title to LoadErrorAlert', async () => {
        mockGetLatestWallets.mockRejectedValue(new Error('fail'))
        const wrapper = mountComponent()
        await flushPromises()
        expect(wrapper.find('.load-error-title').text()).toBe('wallets.listLoadingError')
    })

    it('clicking retry re-runs the load and clears the alert on success', async () => {
        mockGetLatestWallets.mockRejectedValue(new Error('fail'))
        const wrapper = mountComponent()
        await flushPromises()

        mockGetLatestWallets.mockResolvedValue([])
        await wrapper.find('button.load-error-retry').trigger('click')
        await flushPromises()

        expect(wrapper.find('.load-error-alert-stub').exists()).toBe(false)
        expect(mockGetLatestWallets).toHaveBeenCalledTimes(2)
    })

    it('passes the caught error as error prop to LoadErrorAlert', async () => {
        const err = new Error('timeout')
        mockGetLatestWallets.mockRejectedValue(err)
        const wrapper = mountComponent()
        await flushPromises()

        const alert = wrapper.findComponent(loadErrorAlertStub)
        expect(alert.props('error')).toBe(err)
    })

    it('does not show LoadErrorAlert when load succeeds', async () => {
        mockGetLatestWallets.mockResolvedValue([])
        const wrapper = mountComponent()
        await flushPromises()
        expect(wrapper.find('.load-error-alert-stub').exists()).toBe(false)
    })

    it('shows skeletons while loading', () => {
        mockGetLatestWallets.mockReturnValue(new Promise(() => {}))
        const wrapper = mountComponent()
        expect(wrapper.find('.u-skeleton').exists()).toBe(true)
    })
})
