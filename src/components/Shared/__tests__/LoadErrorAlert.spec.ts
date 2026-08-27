import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LoadErrorAlert from '../LoadErrorAlert.vue'
import { STATUS_PAGE_URL } from '@/shared/links'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('@/shared/errors', () => ({
    describeError: (err: unknown) => `described:${String(err)}`,
}))

const alertStub = {
    name: 'Alert',
    props: ['color', 'variant', 'icon', 'title', 'actions'],
    template: `
        <div class="u-alert-stub">
            <span class="u-alert-title">{{ title }}</span>
            <slot name="description" />
            <button
                v-for="(action, i) in (actions || [])"
                :key="i"
                class="u-alert-action"
                @click="action.onClick && action.onClick()"
            >{{ action.label }}</button>
        </div>
    `,
}

// Stub ULink so mounting doesn't pull in vue-router (the real component warns about a
// missing route-location injection). Renders a plain anchor so href/target/rel stay assertable.
const linkStub = {
    name: 'ULinkStub',
    props: ['href', 'to', 'target', 'rel'],
    template: '<a :href="href" :target="target" :rel="rel"><slot /></a>',
}

function mountComponent(props: { title?: string; error?: unknown; retryable?: boolean } = {}) {
    return mount(LoadErrorAlert, {
        props: {
            title: props.title ?? 'Test title',
            error: props.error ?? null,
            ...(props.retryable !== undefined ? { retryable: props.retryable } : {}),
        },
        global: {
            plugins: [createPinia()],
            stubs: {
                Alert: alertStub,
                UAlert: alertStub,
                ULink: linkStub,
                Link: linkStub,
            },
        },
    })
}

describe('LoadErrorAlert', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('renders the title prop', () => {
        const wrapper = mountComponent({ title: 'wallets.listLoadingError' })
        expect(wrapper.text()).toContain('wallets.listLoadingError')
    })

    it('shows common.retry and common.showDetails action labels when retryable', () => {
        const wrapper = mountComponent({ retryable: true })
        expect(wrapper.text()).toContain('common.retry')
        expect(wrapper.text()).toContain('common.showDetails')
    })

    it('does not show common.retry when retryable is omitted (defaults false)', () => {
        const wrapper = mountComponent()
        expect(wrapper.text()).not.toContain('common.retry')
        expect(wrapper.text()).toContain('common.showDetails')
    })

    it('does not show common.retry when retryable is explicitly false', () => {
        const wrapper = mountComponent({ retryable: false })
        expect(wrapper.text()).not.toContain('common.retry')
        expect(wrapper.text()).toContain('common.showDetails')
    })

    it('never emits retry and has no retry button when not retryable', async () => {
        const wrapper = mountComponent({ error: new Error('fail'), retryable: false })
        const retryBtn = wrapper.findAll('button.u-alert-action').find(b => b.text() === 'common.retry')
        expect(retryBtn).toBeUndefined()

        // Show Details still works normally with retryable off.
        const detailsBtn = wrapper.findAll('button.u-alert-action').find(b => b.text() === 'common.showDetails')
        await detailsBtn!.trigger('click')
        expect(wrapper.find('pre').exists()).toBe(true)
        expect(wrapper.emitted('retry')).toBeUndefined()
    })

    it('emits retry and resets showDetails when Try Again is clicked', async () => {
        const wrapper = mountComponent({ error: new Error('fail'), retryable: true })

        // open details first
        const detailsBtn = wrapper.findAll('button.u-alert-action').find(b => b.text() === 'common.showDetails')
        await detailsBtn!.trigger('click')
        expect(wrapper.find('pre').exists()).toBe(true)
        expect(wrapper.vm.showDetails).toBe(true)

        // click retry
        const retryBtn = wrapper.findAll('button.u-alert-action').find(b => b.text() === 'common.retry')
        await retryBtn!.trigger('click')

        expect(wrapper.emitted('retry')).toHaveLength(1)
        expect(wrapper.vm.showDetails).toBe(false)
        expect(wrapper.find('pre').exists()).toBe(false)
    })

    it('toggles the pre block when Show Details is clicked', async () => {
        const wrapper = mountComponent({ error: new Error('timeout') })

        expect(wrapper.find('pre').exists()).toBe(false)

        const detailsBtn = wrapper.findAll('button.u-alert-action').find(b => b.text() === 'common.showDetails')
        await detailsBtn!.trigger('click')

        expect(wrapper.find('pre').exists()).toBe(true)
        expect(wrapper.text()).toContain('described:Error: timeout')
    })

    it('shows common.hideDetails after opening details', async () => {
        const wrapper = mountComponent()
        const detailsBtn = wrapper.findAll('button.u-alert-action').find(b => b.text() === 'common.showDetails')
        await detailsBtn!.trigger('click')
        expect(wrapper.text()).toContain('common.hideDetails')
    })

    it('hides pre after toggling details twice', async () => {
        const wrapper = mountComponent()

        const getDetailsBtn = () => wrapper.findAll('button.u-alert-action').find(b =>
            b.text() === 'common.showDetails' || b.text() === 'common.hideDetails',
        )

        await getDetailsBtn()!.trigger('click')
        expect(wrapper.find('pre').exists()).toBe(true)

        await getDetailsBtn()!.trigger('click')
        expect(wrapper.find('pre').exists()).toBe(false)
    })

    it('exposes showDetails ref', () => {
        const wrapper = mountComponent()
        expect(wrapper.vm.showDetails).toBe(false)
    })

    it('always renders the status page hint with an external link, whether details are collapsed or expanded', async () => {
        const wrapper = mountComponent({ error: new Error('boom') })

        // Collapsed: no <pre>, but the hint + link are present.
        expect(wrapper.find('pre').exists()).toBe(false)
        expect(wrapper.text()).toContain('statusPageHint')
        const link = wrapper.findAll('a').find(a => a.text() === 'statusPageHintLink')
        expect(link).toBeDefined()
        expect(link!.attributes('href')).toBe(STATUS_PAGE_URL)
        expect(link!.attributes('target')).toBe('_blank')
        expect(link!.attributes('rel')).toBe('noopener noreferrer')

        // Expanded: the <pre> shows and the hint is still rendered.
        const detailsBtn = wrapper.findAll('button.u-alert-action').find(b => b.text() === 'common.showDetails')
        await detailsBtn!.trigger('click')
        expect(wrapper.find('pre').exists()).toBe(true)
        expect(wrapper.findAll('a').some(a => a.text() === 'statusPageHintLink')).toBe(true)
    })

    it('pre text contains describeError output', async () => {
        const wrapper = mountComponent({ error: new Error('network') })
        const detailsBtn = wrapper.findAll('button.u-alert-action').find(b => b.text() === 'common.showDetails')
        await detailsBtn!.trigger('click')
        expect(wrapper.find('pre').text()).toBe('described:Error: network')
    })
})
