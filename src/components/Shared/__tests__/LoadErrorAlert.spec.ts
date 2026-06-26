import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LoadErrorAlert from '../LoadErrorAlert.vue'

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

function mountComponent(props: { title?: string; error?: unknown } = {}) {
    return mount(LoadErrorAlert, {
        props: {
            title: props.title ?? 'Test title',
            error: props.error ?? null,
        },
        global: {
            plugins: [createPinia()],
            stubs: {
                Alert: alertStub,
                UAlert: alertStub,
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

    it('shows common.retry and common.showDetails action labels', () => {
        const wrapper = mountComponent()
        expect(wrapper.text()).toContain('common.retry')
        expect(wrapper.text()).toContain('common.showDetails')
    })

    it('emits retry and resets showDetails when Try Again is clicked', async () => {
        const wrapper = mountComponent({ error: new Error('fail') })

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

    it('pre text contains describeError output', async () => {
        const wrapper = mountComponent({ error: new Error('network') })
        const detailsBtn = wrapper.findAll('button.u-alert-action').find(b => b.text() === 'common.showDetails')
        await detailsBtn!.trigger('click')
        expect(wrapper.find('pre').text()).toBe('described:Error: network')
    })
})
