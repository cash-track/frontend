import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AppFooter from '../AppFooter.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@/shared/links', () => ({
    webSiteLink: (path: string) => `https://cash-track.app${path}`,
    releaseTagLink: (tag: string) => `https://github.com/cash-track/frontend/releases/tag/${tag}`,
    commitLink: (sha: string) => `https://github.com/cash-track/frontend/commit/${sha}`,
}))

afterEach(() => {
    delete window.__APP_CONFIG__
})

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

    describe('release version / commit sha', () => {
        const fullSha = '5009cb0aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        const shortSha = '5009cb0'

        it('renders tag and shortened sha, both linked to the release page, when both are set', () => {
            window.__APP_CONFIG__ = {
                VITE_APP_VERSION: 'v2.0.5',
                VITE_APP_COMMIT: fullSha,
            }
            const wrapper = mount(AppFooter)

            expect(wrapper.text()).toContain('· v2.0.5 · ' + shortSha)
            expect(wrapper.text()).not.toContain(fullSha)

            const releaseUrl = 'https://github.com/cash-track/frontend/releases/tag/v2.0.5'
            const tagLink = wrapper.findAll('a').find(a => a.text() === 'v2.0.5')
            const shaLink = wrapper.findAll('a').find(a => a.text() === shortSha)
            expect(tagLink?.attributes('href')).toBe(releaseUrl)
            expect(shaLink?.attributes('href')).toBe(releaseUrl)
            expect(tagLink?.attributes('target')).toBe('_blank')
            expect(tagLink?.attributes('rel')).toBe('noopener noreferrer')
            expect(shaLink?.attributes('target')).toBe('_blank')
            expect(shaLink?.attributes('rel')).toBe('noopener noreferrer')
        })

        it('renders only the shortened sha, linked to the commit page, when the tag is not a release tag', () => {
            // Snapshot builds pass the branch name (e.g. "master") as the version build-arg.
            window.__APP_CONFIG__ = {
                VITE_APP_VERSION: 'master',
                VITE_APP_COMMIT: fullSha,
            }
            const wrapper = mount(AppFooter)

            expect(wrapper.text()).toContain('· ' + shortSha)
            expect(wrapper.text()).not.toContain('master')

            const shaLink = wrapper.findAll('a').find(a => a.text() === shortSha)
            expect(shaLink?.attributes('href')).toBe(
                `https://github.com/cash-track/frontend/commit/${fullSha}`,
            )
        })

        it('renders only the shortened sha, linked to the commit page, when the tag is absent', () => {
            window.__APP_CONFIG__ = {
                VITE_APP_COMMIT: fullSha,
            }
            const wrapper = mount(AppFooter)

            expect(wrapper.text()).toContain('· ' + shortSha)

            const shaLink = wrapper.findAll('a').find(a => a.text() === shortSha)
            expect(shaLink?.attributes('href')).toBe(
                `https://github.com/cash-track/frontend/commit/${fullSha}`,
            )
        })

        it('renders the plain copyright line with no separator or links when neither is set', () => {
            const wrapper = mount(AppFooter)

            expect(wrapper.text()).not.toContain('·')
            expect(wrapper.findAll('.text-primary-500')).toHaveLength(3)
        })
    })
})
