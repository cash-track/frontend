import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HamburgerMenu from '../HamburgerMenu.vue'

const globalStubs = {
    global: {
        stubs: {
            UIcon: { template: '<span :data-name="name" />', props: ['name', 'class'] },
            Icon: { template: '<span :data-name="name" />', props: ['name', 'class'] },
        },
    },
}

describe('HamburgerMenu', () => {
    it('renders menu icon when isOpen is false', () => {
        const wrapper = mount(HamburgerMenu, { props: { isOpen: false }, ...globalStubs })
        expect(wrapper.find('[data-name="i-lucide-menu"]').exists()).toBe(true)
        expect(wrapper.find('[data-name="i-lucide-x"]').exists()).toBe(false)
    })

    it('renders close icon when isOpen is true', () => {
        const wrapper = mount(HamburgerMenu, { props: { isOpen: true }, ...globalStubs })
        expect(wrapper.find('[data-name="i-lucide-x"]').exists()).toBe(true)
        expect(wrapper.find('[data-name="i-lucide-menu"]').exists()).toBe(false)
    })

    it('renders menu icon by default (isOpen omitted)', () => {
        const wrapper = mount(HamburgerMenu, { ...globalStubs })
        expect(wrapper.find('[data-name="i-lucide-menu"]').exists()).toBe(true)
    })
})
