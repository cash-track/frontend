import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import WalletsGridList from '../WalletsGridList.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (k: string) => k }),
}))

const mockGetArchived = vi.fn()

vi.mock('@/api/wallets', () => ({
    getArchived: (...args: unknown[]) => mockGetArchived(...args),
}))

vi.mock('@/components/wallets/WalletCard.vue', () => ({
    default: { template: '<div class="wallet-card" />', props: ['wallet'] },
}))

// LoadErrorAlert stub that emits retry on button click
const loadErrorAlertStub = {
    name: 'LoadErrorAlert',
    props: ['title', 'error'],
    emits: ['retry'],
    template: `
        <div class="load-error-alert-stub">
            <span class="load-error-title">{{ title }}</span>
            <button class="load-error-retry" @click="$emit('retry')">retry</button>
        </div>
    `,
}

function mountComponent(byArchived = true) {
    return mount(WalletsGridList, {
        props: { wallets: [], byArchived },
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

describe('WalletsGridList', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockGetArchived.mockReset()
    })

    it('shows LoadErrorAlert when getArchived fails', async () => {
        mockGetArchived.mockRejectedValue(new Error('network fail'))
        const wrapper = mountComponent(true)
        await flushPromises()
        expect(wrapper.find('.load-error-alert-stub').exists()).toBe(true)
    })

    it('passes wallets.listLoadingError as title to LoadErrorAlert', async () => {
        mockGetArchived.mockRejectedValue(new Error('fail'))
        const wrapper = mountComponent(true)
        await flushPromises()
        expect(wrapper.find('.load-error-title').text()).toBe('wallets.listLoadingError')
    })

    it('clicking retry re-runs the load and clears the alert on success', async () => {
        mockGetArchived.mockRejectedValue(new Error('fail'))
        const wrapper = mountComponent(true)
        await flushPromises()

        mockGetArchived.mockResolvedValue([])
        await wrapper.find('button.load-error-retry').trigger('click')
        await flushPromises()

        expect(wrapper.find('.load-error-alert-stub').exists()).toBe(false)
        expect(mockGetArchived).toHaveBeenCalledTimes(2)
    })

    it('passes the caught error as error prop to LoadErrorAlert', async () => {
        const err = new Error('timeout')
        mockGetArchived.mockRejectedValue(err)
        const wrapper = mountComponent(true)
        await flushPromises()

        const alert = wrapper.findComponent(loadErrorAlertStub)
        expect(alert.props('error')).toBe(err)
    })

    it('does not load archived when byArchived is false', async () => {
        mountComponent(false)
        await flushPromises()
        expect(mockGetArchived).not.toHaveBeenCalled()
    })

    it('does not show LoadErrorAlert when load succeeds', async () => {
        mockGetArchived.mockResolvedValue([])
        const wrapper = mountComponent(true)
        await flushPromises()
        expect(wrapper.find('.load-error-alert-stub').exists()).toBe(false)
    })
})
