import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, shallowRef } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import WalletsActiveGridList from '../WalletsActiveGridList.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useRoute: () => ({ params: {}, query: {} }),
    RouterLink: { template: '<a><slot /></a>' },
}))

vi.mock('vuedraggable', () => ({
    default: {
        template: '<div><slot name="item" v-for="item in modelValue" :element="item" /></div>',
        props: ['modelValue', 'itemKey', 'animation', 'ghostClass', 'delay', 'delayOnTouchOnly'],
        emits: ['update:modelValue', 'end'],
    },
}))

vi.mock('@/api/wallets', () => ({
    sortWallets: vi.fn().mockResolvedValue(undefined),
    getUnarchived: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/components/wallets/WalletCard.vue', () => ({
    default: { template: '<div class="wallet-card" />', props: ['wallet'] },
}))

const mockLoadActive = vi.fn()
const mockActiveWallets = shallowRef<unknown[]>([])
const mockLastError = shallowRef<unknown>(null)
const mockFailed = ref(false)
const mockLoading = ref(false)

vi.mock('@/stores/wallets', () => ({
    useWalletsStore: () => ({
        activeWallets: mockActiveWallets,
        loading: mockLoading,
        failed: mockFailed,
        lastError: mockLastError,
        loadActive: mockLoadActive,
    }),
}))

// LoadErrorAlert stub — exposes a retry emit and renders via class for findComponent
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

function mountComponent() {
    return mount(WalletsActiveGridList, {
        global: {
            plugins: [createPinia()],
            stubs: {
                LoadErrorAlert: loadErrorAlertStub,
                USkeleton: { template: '<div class="u-skeleton" />' },
                Skeleton: { template: '<div class="u-skeleton" />' },
                RouterLink: { template: '<a><slot /></a>' },
            },
        },
    })
}

describe('WalletsActiveGridList', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockFailed.value = false
        mockLoading.value = false
        mockLastError.value = null
        mockActiveWallets.value = []
        mockLoadActive.mockReset()
    })

    it('shows LoadErrorAlert when failed is true', () => {
        mockFailed.value = true
        const wrapper = mountComponent()
        expect(wrapper.find('.load-error-alert-stub').exists()).toBe(true)
    })

    it('passes wallets.listLoadingError as title to LoadErrorAlert', () => {
        mockFailed.value = true
        const wrapper = mountComponent()
        expect(wrapper.find('.load-error-title').text()).toBe('wallets.listLoadingError')
    })

    it('clicking retry on LoadErrorAlert calls walletsStore.loadActive', async () => {
        mockFailed.value = true
        const wrapper = mountComponent()
        await wrapper.find('button.load-error-retry').trigger('click')
        expect(mockLoadActive).toHaveBeenCalledTimes(1)
    })

    it('does not show LoadErrorAlert when not failed', () => {
        mockFailed.value = false
        const wrapper = mountComponent()
        expect(wrapper.find('.load-error-alert-stub').exists()).toBe(false)
    })

    it('passes lastError as error prop to LoadErrorAlert', () => {
        mockFailed.value = true
        const err = new Error('test error')
        mockLastError.value = err
        const wrapper = mountComponent()
        const alert = wrapper.findComponent(loadErrorAlertStub)
        expect(alert.props('error')).toBe(err)
    })
})
