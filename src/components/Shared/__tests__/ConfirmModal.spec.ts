import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import ConfirmModal from '../ConfirmModal.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

// UModal renders two named slots: #body and #footer.
// The stub must forward them so the body content (description, alert) and
// footer content (buttons) are actually rendered in the test DOM.
const uModalStub = {
    name: 'UModal',
    template: '<div><slot name="body" /><slot name="footer" /></div>',
    props: ['open', 'title'],
}

// Module-level stub so findAllComponents(uButtonStub) resolves by reference.
const uButtonStub = {
    template: '<button @click="$emit(\'click\')">{{ label }}</button>',
    props: ['label', 'variant', 'color', 'loading', 'disabled'],
    emits: ['click'],
}

const makeGlobal = () => ({
    global: {
        stubs: {
            UModal: uModalStub,
            Modal: uModalStub,
            UButton: uButtonStub,
            Button: uButtonStub,
            UAlert: {
                template: '<div data-testid="alert">{{ description }}</div>',
                props: ['color', 'variant', 'icon', 'description'],
            },
            Alert: {
                template: '<div data-testid="alert">{{ description }}</div>',
                props: ['color', 'variant', 'icon', 'description'],
            },
        },
    },
})

const baseProps = {
    open: true,
    title: 'Confirm',
    description: 'Are you sure?',
}

describe('ConfirmModal', () => {
    it('renders description text', () => {
        const wrapper = mount(ConfirmModal, { props: baseProps, ...makeGlobal() })
        expect(wrapper.text()).toContain('Are you sure?')
    })

    it('does not render error alert when error prop is null', () => {
        const wrapper = mount(ConfirmModal, {
            props: { ...baseProps, error: null },
            ...makeGlobal(),
        })
        expect(wrapper.find('[data-testid="alert"]').exists()).toBe(false)
    })

    it('does not render error alert when error prop is omitted', () => {
        const wrapper = mount(ConfirmModal, { props: baseProps, ...makeGlobal() })
        expect(wrapper.find('[data-testid="alert"]').exists()).toBe(false)
    })

    it('renders error alert when error prop is a non-empty string', () => {
        const wrapper = mount(ConfirmModal, {
            props: { ...baseProps, error: 'Unable to delete. Please try again.' },
            ...makeGlobal(),
        })
        const alert = wrapper.find('[data-testid="alert"]')
        expect(alert.exists()).toBe(true)
        expect(alert.text()).toContain('Unable to delete. Please try again.')
    })

    it('emits confirm when confirm button is clicked', async () => {
        const wrapper = mount(ConfirmModal, { props: baseProps, ...makeGlobal() })
        const buttons = wrapper.findAll('button')
        const confirmBtn = buttons.find(b => b.text() === 'common.delete')
        expect(confirmBtn).toBeDefined()
        await confirmBtn!.trigger('click')
        expect(wrapper.emitted('confirm')).toBeTruthy()
    })

    it('emits update:open false when cancel button is clicked', async () => {
        const wrapper = mount(ConfirmModal, { props: baseProps, ...makeGlobal() })
        const buttons = wrapper.findAll('button')
        const cancelBtn = buttons.find(b => b.text() === 'common.cancel')
        expect(cancelBtn).toBeDefined()
        await cancelBtn!.trigger('click')
        expect(wrapper.emitted('update:open')).toEqual([[false]])
    })

    it('cancel button has color="neutral" and variant="ghost"', () => {
        const wrapper = mount(ConfirmModal, { props: baseProps, ...makeGlobal() })
        // Use the stub object reference so findAllComponents resolves correctly.
        const allButtons = wrapper.findAllComponents(uButtonStub)
        const cancelBtn = allButtons.find(b => b.props('label') === 'common.cancel')
        expect(cancelBtn).toBeDefined()
        expect(cancelBtn!.props('color')).toBe('neutral')
        expect(cancelBtn!.props('variant')).toBe('ghost')
    })
})
