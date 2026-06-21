import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import SettingsView from '../SettingsView.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

vi.mock('@/views/settings/ProfileSettingsView.vue', () => ({
    default: { template: '<div />' },
}))

vi.mock('@/views/settings/SecuritySettingsView.vue', () => ({
    default: { template: '<div />' },
}))

describe('SettingsView.vue', () => {
    function mountView() {
        return shallowMount(SettingsView, {
            global: {
                stubs: {
                    // Nuxt UI registers UContainer internally as 'Container' (same as
                    // UIcon->Icon), so the stub must be keyed 'Container', not 'UContainer'.
                    // Pass-through so the h1 inside is reachable in shallowMount.
                    Container: { template: '<div><slot /></div>' },
                },
            },
        })
    }

    it('renders the personalSettings.header heading', () => {
        const wrapper = mountView()
        expect(wrapper.find('h1').exists()).toBe(true)
        expect(wrapper.find('h1').text()).toBe('personalSettings.header')
    })

    it('passes profile and security tab labels in the tabs computed', () => {
        const wrapper = mountView()
        const vm = wrapper.vm as unknown as { tabs: Array<{ label: string; slot: string }> }
        const labels = vm.tabs.map(tab => tab.label)
        expect(labels).toContain('personalSettings.profile')
        expect(labels).toContain('personalSettings.security')
    })

    it('has profile as the first tab and security as the second', () => {
        const wrapper = mountView()
        const vm = wrapper.vm as unknown as { tabs: Array<{ label: string; slot: string }> }
        expect(vm.tabs[0].label).toBe('personalSettings.profile')
        expect(vm.tabs[1].label).toBe('personalSettings.security')
    })

    it('tabs have the expected slot names', () => {
        const wrapper = mountView()
        const vm = wrapper.vm as unknown as { tabs: Array<{ label: string; slot: string }> }
        expect(vm.tabs[0].slot).toBe('profile')
        expect(vm.tabs[1].slot).toBe('security')
    })
})
