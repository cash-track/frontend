import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TagForm from '../TagForm.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

vi.mock('@/api/tags', () => ({
    createTag: vi.fn(),
    updateTag: vi.fn(),
}))

// Stub only Nuxt UI components. Use real input elements via UInput stub
// that forward the v-model correctly.
const makeGlobal = () => ({
    global: {
        stubs: {
            UInput: {
                template: `<input
                    :value="modelValue"
                    :placeholder="placeholder"
                    :disabled="disabled"
                    :type="type || 'text'"
                    :maxlength="maxlength"
                    @input="$emit('update:modelValue', $event.target.value)"
                />`,
                props: ['modelValue', 'placeholder', 'disabled', 'status', 'maxlength', 'type'],
                emits: ['update:modelValue'],
            },
            UFormField: { template: '<div><slot /></div>', props: ['error', 'class'] },
            UButton: {
                template: '<button :type="type || \'button\'" :disabled="!!disabled"><slot /></button>',
                props: ['loading', 'disabled', 'type', 'class'],
            },
            UAlert: { template: '<div />', props: ['color', 'description', 'icon', 'class'] },
            TagBadge: { template: '<span />', props: ['tag', 'class'] },
        },
    },
})

function findNameInput(wrapper: ReturnType<typeof mount>) {
    // i18n mock returns key as-is: placeholder="tags.inputLabel"
    return wrapper.find('input[placeholder="tags.inputLabel"]')
}

describe('TagForm.vue', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('shows create button in create mode (no tag prop)', () => {
        const wrapper = mount(TagForm, makeGlobal())
        expect(wrapper.text()).toContain('tags.create')
    })

    it('shows update button in edit mode (tag prop provided)', () => {
        const tag = { id: 1, name: 'Food', icon: null, color: '#ff0000', userId: 1, createdAt: new Date(), updatedAt: new Date() }
        const wrapper = mount(TagForm, { props: { tag }, ...makeGlobal() })
        expect(wrapper.text()).toContain('tags.update')
    })

    it('submit button is disabled when name is empty', () => {
        const wrapper = mount(TagForm, makeGlobal())
        const btn = wrapper.find('button[type="submit"]')
        expect(btn.element.disabled).toBe(true)
    })

    it('submit button is disabled when name is fewer than 3 chars', async () => {
        const wrapper = mount(TagForm, makeGlobal())
        const nameInput = findNameInput(wrapper)
        await nameInput.setValue('ab')
        await nextTick()
        const btn = wrapper.find('button[type="submit"]')
        expect(btn.element.disabled).toBe(true)
    })

    it('submit button is disabled when name contains whitespace', async () => {
        const wrapper = mount(TagForm, makeGlobal())
        const nameInput = findNameInput(wrapper)
        await nameInput.setValue('has space')
        await nextTick()
        const btn = wrapper.find('button[type="submit"]')
        expect(btn.element.disabled).toBe(true)
    })

    it('submit button is enabled when name is valid (>= 3 chars, no spaces)', async () => {
        const wrapper = mount(TagForm, makeGlobal())
        const nameInput = findNameInput(wrapper)
        await nameInput.setValue('Shopping')
        await nextTick()
        const btn = wrapper.find('button[type="submit"]')
        expect(btn.element.disabled).toBe(false)
    })

    it('submit button is enabled for a short 3-char name without spaces', async () => {
        const wrapper = mount(TagForm, makeGlobal())
        const nameInput = findNameInput(wrapper)
        await nameInput.setValue('xyz')
        await nextTick()
        const btn = wrapper.find('button[type="submit"]')
        expect(btn.element.disabled).toBe(false)
    })
})
