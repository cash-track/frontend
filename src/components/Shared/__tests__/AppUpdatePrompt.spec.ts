import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AppUpdatePrompt from '../AppUpdatePrompt.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}))

// vi.hoisted() runs before static imports are initialized, so a real Vue `ref()`
// (which needs the statically-imported `ref` binding) can't be built here directly —
// referencing it throws a TDZ ReferenceError. Use a plain state carrier instead and
// construct the real ref lazily inside the (async) mock factory below, which runs
// after imports have settled.
const { mockNeedRefreshState, mockUpdateApp } = vi.hoisted(() => ({
    mockNeedRefreshState: { value: false },
    mockUpdateApp: vi.fn(async () => {}),
}))

vi.mock('@/pwa', async () => {
    const { ref } = await import('vue')
    return {
        usePWAUpdate: () => ({
            needRefresh: ref(mockNeedRefreshState.value),
            updateApp: mockUpdateApp,
        }),
    }
})

// Module-level stub so findAllComponents(uButtonStub) resolves by reference.
const uButtonStub = {
    template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
    props: ['label', 'color', 'size', 'loading', 'disabled'],
    emits: ['click'],
}

const makeGlobal = () => ({
    global: {
        stubs: {
            UButton: uButtonStub,
            Button: uButtonStub,
        },
    },
})

describe('AppUpdatePrompt', () => {
    beforeEach(() => {
        mockNeedRefreshState.value = false
        mockUpdateApp.mockClear()
    })

    it('renders nothing when needRefresh is false', () => {
        const wrapper = mount(AppUpdatePrompt, makeGlobal())
        expect(wrapper.find('div').exists()).toBe(false)
    })

    it('renders the update message and reload button when needRefresh is true', () => {
        mockNeedRefreshState.value = true
        const wrapper = mount(AppUpdatePrompt, makeGlobal())
        expect(wrapper.text()).toContain('pwa.newVersion')
        expect(wrapper.text()).toContain('pwa.reload')
    })

    it('calls updateApp when the reload button is clicked', async () => {
        mockNeedRefreshState.value = true
        const wrapper = mount(AppUpdatePrompt, makeGlobal())
        await wrapper.find('button').trigger('click')
        expect(mockUpdateApp).toHaveBeenCalledTimes(1)
    })

    it('disables the reload button after clicking to show a loading state', async () => {
        mockNeedRefreshState.value = true
        const wrapper = mount(AppUpdatePrompt, makeGlobal())
        const button = wrapper.find('button')
        expect(button.attributes('disabled')).toBeUndefined()

        await button.trigger('click')

        expect(button.attributes('disabled')).toBeDefined()
    })

    it('does not disable the button before any interaction', () => {
        mockNeedRefreshState.value = true
        const wrapper = mount(AppUpdatePrompt, makeGlobal())
        const button = wrapper.findComponent(uButtonStub)
        expect(button.props('disabled')).toBe(false)
        expect(button.props('loading')).toBe(false)
    })
})
