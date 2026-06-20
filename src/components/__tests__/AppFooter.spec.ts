import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AppFooter from '../AppFooter.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@/shared/links', () => ({
    webSiteLink: (path: string) => `https://cash-track.app${path}`,
}))

describe('AppFooter', () => {
    it('renders exactly 3 elements with class text-primary-500', () => {
        const wrapper = mount(AppFooter)
        expect(wrapper.findAll('.text-primary-500')).toHaveLength(3)
    })

    it('does not contain any gray link text classes', () => {
        const wrapper = mount(AppFooter)
        // Guard against any gray text variant (text-gray-500/700, dark:text-gray-*) so a
        // partial revert to the old gray link styling is caught. The border uses
        // border-gray-*, not text-gray-*, so it is unaffected by this assertion.
        expect(wrapper.html()).not.toContain('text-gray-')
    })

    it('renders the footer i18n keys as text', () => {
        const wrapper = mount(AppFooter)
        expect(wrapper.text()).toContain('cookiePolicy')
        expect(wrapper.text()).toContain('privacyPolicy')
        expect(wrapper.text()).toContain('madeBy')
    })

    it('renders the brand name and current year', () => {
        const wrapper = mount(AppFooter)
        expect(wrapper.text()).toContain('Cash Track')
        expect(wrapper.text()).toContain(String(new Date().getFullYear()))
    })
})
