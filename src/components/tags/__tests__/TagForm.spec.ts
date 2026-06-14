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
    createI18n: () => ({
        global: { t: (key: string) => key, locale: { value: 'en' }, setLocaleMessage: vi.fn() },
    }),
}))

const mockCreateTag = vi.fn()
const mockUpdateTag = vi.fn()
vi.mock('@/api/tags', () => ({
    createTag: (...args: unknown[]) => mockCreateTag(...args),
    updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}))

const inputStub = {
    template: `<input
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :type="type || 'text'"
        :maxlength="maxlength"
        @input="$emit('update:modelValue', $event.target.value)"
    />`,
    props: ['modelValue', 'placeholder', 'disabled', 'status', 'maxlength', 'type', 'ui', 'class'],
    emits: ['update:modelValue'],
}

// UFormField renders error text; bare-name keys needed because Nuxt UI derives
// component names from filenames (UFormField → FormField, UButton → Button, etc.)
const formFieldStub = {
    template: '<div><slot /><span v-if="error" class="field-error">{{ error }}</span></div>',
    props: ['error', 'class'],
}

const buttonStub = {
    template: '<button :type="type || \'button\'" :disabled="!!disabled"><slot /></button>',
    props: ['loading', 'disabled', 'type', 'class', 'ui'],
}

// Stub only Nuxt UI components. Use real input elements via UInput stub
// that forward the v-model correctly.
const makeGlobal = () => ({
    global: {
        stubs: {
            UInput: inputStub,
            Input: inputStub,
            UFormField: formFieldStub,
            FormField: formFieldStub,
            UButton: buttonStub,
            Button: buttonStub,
            UAlert: { template: '<div />', props: ['color', 'description', 'icon', 'class'] },
            Alert: { template: '<div />', props: ['color', 'description', 'icon', 'class'] },
            UIcon: { template: '<span />', props: ['name', 'class'] },
            Icon: { template: '<span />', props: ['name', 'class'] },
            TagChip: { template: '<span />', props: ['tag', 'class'] },
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
        mockCreateTag.mockReset()
        mockUpdateTag.mockReset()
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
        expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('submit button is disabled when name is fewer than 3 chars', async () => {
        const wrapper = mount(TagForm, makeGlobal())
        const nameInput = findNameInput(wrapper)
        await nameInput.setValue('ab')
        await nextTick()
        const btn = wrapper.find('button[type="submit"]')
        expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('submit button is disabled when parsed name contains whitespace', async () => {
        const wrapper = mount(TagForm, makeGlobal())
        const nameInput = findNameInput(wrapper)
        await nameInput.setValue('has space')
        await nextTick()
        const btn = wrapper.find('button[type="submit"]')
        expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('submit button is enabled when input has leading emoji and valid name', async () => {
        const wrapper = mount(TagForm, makeGlobal())
        const nameInput = findNameInput(wrapper)
        await nameInput.setValue('🥦 Food')
        await nextTick()
        const btn = wrapper.find('button[type="submit"]')
        expect((btn.element as HTMLButtonElement).disabled).toBe(false)
    })

    it('populates input as "icon name" in edit mode', () => {
        const tag = { id: 1, name: 'Food', icon: '🥦', color: null, userId: 1, createdAt: new Date(), updatedAt: new Date() }
        const wrapper = mount(TagForm, { props: { tag }, ...makeGlobal() })
        const nameInput = findNameInput(wrapper)
        expect((nameInput.element as HTMLInputElement).value).toBe('🥦 Food')
    })

    it('populates input as plain name when tag has no icon', () => {
        const tag = { id: 1, name: 'Food', icon: null, color: null, userId: 1, createdAt: new Date(), updatedAt: new Date() }
        const wrapper = mount(TagForm, { props: { tag }, ...makeGlobal() })
        const nameInput = findNameInput(wrapper)
        expect((nameInput.element as HTMLInputElement).value).toBe('Food')
    })

    it('submit button is enabled when name is valid (>= 3 chars, no spaces)', async () => {
        const wrapper = mount(TagForm, makeGlobal())
        const nameInput = findNameInput(wrapper)
        await nameInput.setValue('Shopping')
        await nextTick()
        const btn = wrapper.find('button[type="submit"]')
        expect((btn.element as HTMLButtonElement).disabled).toBe(false)
    })

    it('submit button is enabled for a short 3-char name without spaces', async () => {
        const wrapper = mount(TagForm, makeGlobal())
        const nameInput = findNameInput(wrapper)
        await nameInput.setValue('xyz')
        await nextTick()
        const btn = wrapper.find('button[type="submit"]')
        expect((btn.element as HTMLButtonElement).disabled).toBe(false)
    })

    // --- Validation message tests (M10) ---

    it('validationError is null when input is empty (pristine — no nag)', () => {
        const wrapper = mount(TagForm, makeGlobal())
        const vm = wrapper.vm as unknown as { validationError: string | null }
        expect(vm.validationError).toBeNull()
    })

    it('shows no error text when input is empty', () => {
        const wrapper = mount(TagForm, makeGlobal())
        expect(wrapper.find('.field-error').exists()).toBe(false)
    })

    it('shows tags.nameTooShort for input "ab"', async () => {
        const wrapper = mount(TagForm, makeGlobal())
        await findNameInput(wrapper).setValue('ab')
        await nextTick()
        const vm = wrapper.vm as unknown as { validationError: string | null }
        expect(vm.validationError).toBe('tags.nameTooShort')
        expect(wrapper.find('.field-error').text()).toBe('tags.nameTooShort')
        expect((wrapper.find('button[type="submit"]').element as HTMLButtonElement).disabled).toBe(true)
    })

    it('shows tags.nameNoSpaces for input "my tag"', async () => {
        const wrapper = mount(TagForm, makeGlobal())
        await findNameInput(wrapper).setValue('my tag')
        await nextTick()
        const vm = wrapper.vm as unknown as { validationError: string | null }
        expect(vm.validationError).toBe('tags.nameNoSpaces')
        expect(wrapper.find('.field-error').text()).toBe('tags.nameNoSpaces')
        expect((wrapper.find('button[type="submit"]').element as HTMLButtonElement).disabled).toBe(true)
    })

    it('shows tags.nameRequired for emoji-only input "🥦"', async () => {
        const wrapper = mount(TagForm, makeGlobal())
        await findNameInput(wrapper).setValue('🥦')
        await nextTick()
        const vm = wrapper.vm as unknown as { validationError: string | null }
        expect(vm.validationError).toBe('tags.nameRequired')
        expect(wrapper.find('.field-error').text()).toBe('tags.nameRequired')
        expect((wrapper.find('button[type="submit"]').element as HTMLButtonElement).disabled).toBe(true)
    })

    it('no validation error for valid input "abc"', async () => {
        const wrapper = mount(TagForm, makeGlobal())
        await findNameInput(wrapper).setValue('abc')
        await nextTick()
        const vm = wrapper.vm as unknown as { validationError: string | null }
        expect(vm.validationError).toBeNull()
        expect(wrapper.find('.field-error').exists()).toBe(false)
        expect((wrapper.find('button[type="submit"]').element as HTMLButtonElement).disabled).toBe(false)
    })

    it('no error for "🥦 Food" and calls createTag with parsed fields on submit', async () => {
        const fakeTag = { id: 1, name: 'Food', icon: '🥦', color: '#6366f1', userId: 0, createdAt: new Date(), updatedAt: new Date() }
        mockCreateTag.mockResolvedValue(fakeTag)

        const wrapper = mount(TagForm, makeGlobal())
        await findNameInput(wrapper).setValue('🥦 Food')
        await nextTick()

        const vm = wrapper.vm as unknown as { validationError: string | null }
        expect(vm.validationError).toBeNull()
        expect((wrapper.find('button[type="submit"]').element as HTMLButtonElement).disabled).toBe(false)

        await wrapper.find('form').trigger('submit')

        await vi.waitFor(() => {
            expect(mockCreateTag).toHaveBeenCalledTimes(1)
        })

        const callArg = mockCreateTag.mock.calls[0][0]
        expect(callArg.name).toBe('Food')
        expect(callArg.icon).toBe('🥦')
        expect(callArg.color).toBe('#6366f1')

        await vi.waitFor(() => {
            expect(wrapper.emitted('tag-created')).toBeTruthy()
        })
    })

    it('help text contains tags.nameRules', () => {
        const wrapper = mount(TagForm, makeGlobal())
        expect(wrapper.text()).toContain('tags.nameRules')
    })
})
