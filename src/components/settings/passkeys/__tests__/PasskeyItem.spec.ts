import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PasskeyItem from '../PasskeyItem.vue'
import { Passkey } from '@/api/models/passkey'

const { mockDeletePasskey } = vi.hoisted(() => ({
    mockDeletePasskey: vi.fn(),
}))

const mockLocale = { value: 'en' }

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: mockLocale,
    }),
}))

vi.mock('@/api/profile/passkeys', () => ({
    deletePasskey: mockDeletePasskey,
}))

const globalStubs = {
    global: {
        stubs: {
            UButton: {
                template: '<button :disabled="disabled || loading" @click="$emit(\'click\')">{{ label }}</button>',
                props: ['label', 'loading', 'disabled', 'color', 'variant', 'size', 'class'],
                emits: ['click'],
            },
            UIcon: { template: '<span />', props: ['name', 'class'] },
            Icon: { template: '<span />', props: ['name', 'class'] },
            UTooltip: { template: '<span><slot /></span>', props: ['text', 'arrow'] },
            Tooltip: { template: '<span><slot /></span>', props: ['text', 'arrow'] },
            ConfirmModal: {
                template: '<div><slot /><button class="confirm-btn" @click="$emit(\'confirm\')">confirm</button></div>',
                props: ['open', 'title', 'description', 'confirmLabel', 'cancelLabel', 'loading'],
                emits: ['update:open', 'confirm'],
            },
        },
    },
}

function makePasskey(usedAt: Date | null = null): Passkey {
    return new Passkey({
        id: 1,
        name: 'My YubiKey',
        createdAt: new Date('2024-06-01T00:00:00Z'),
        usedAt,
    })
}

describe('PasskeyItem', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        mockLocale.value = 'en'
    })

    it('renders passkey name', () => {
        const wrapper = mount(PasskeyItem, { ...globalStubs, props: { passkey: makePasskey() } })
        expect(wrapper.text()).toContain('My YubiKey')
    })

    it('shows "never" when usedAt is null', () => {
        const wrapper = mount(PasskeyItem, { ...globalStubs, props: { passkey: makePasskey(null) } })
        expect(wrapper.text()).toContain('passkeySettings.usedAtNever')
    })

    it('shows formatted date when usedAt is set', () => {
        const usedAt = new Date('2024-09-15T12:00:00Z')
        const wrapper = mount(PasskeyItem, { ...globalStubs, props: { passkey: makePasskey(usedAt) } })
        expect(wrapper.text()).not.toContain('passkeySettings.usedAtNever')
        expect(wrapper.text()).toContain('passkeySettings.used')
    })

    it('opens confirm modal when delete button is clicked', async () => {
        const wrapper = mount(PasskeyItem, { ...globalStubs, props: { passkey: makePasskey() } })
        const vm = wrapper.vm as unknown as { confirmOpen: boolean }

        expect(vm.confirmOpen).toBe(false)
        await wrapper.find('button').trigger('click')
        expect(vm.confirmOpen).toBe(true)
    })

    it('calls deletePasskey and emits deleted after confirmation', async () => {
        mockDeletePasskey.mockResolvedValue(undefined)

        const wrapper = mount(PasskeyItem, { ...globalStubs, props: { passkey: makePasskey() } })
        const vm = wrapper.vm as unknown as { onDeleteConfirmed: () => Promise<void> }
        await vm.onDeleteConfirmed()

        expect(mockDeletePasskey).toHaveBeenCalledWith(1)
        expect(wrapper.emitted('deleted')).toBeTruthy()
    })

    it('shows inline delete error and does not emit deleted when delete fails', async () => {
        mockDeletePasskey.mockRejectedValue(new Error('Network error'))

        const wrapper = mount(PasskeyItem, { ...globalStubs, props: { passkey: makePasskey() } })
        const vm = wrapper.vm as unknown as { onDeleteConfirmed: () => Promise<void>; deleteError: string | null }
        await vm.onDeleteConfirmed()

        expect(vm.deleteError).toBe('Network error')
        expect(wrapper.emitted('deleted')).toBeFalsy()
    })

    it('formats createdAt with the app locale (uk → Ukrainian short month abbreviation)', () => {
        mockLocale.value = 'uk'
        // 2024-06-01 in Ukrainian with month:'short': June abbreviation is 'черв.'
        const wrapper = mount(PasskeyItem, { ...globalStubs, props: { passkey: makePasskey() } })
        expect(wrapper.text()).toContain('черв.')
        expect(wrapper.text()).not.toContain('Jun')
    })

    it('formats usedAt with the app locale (uk → Ukrainian short month abbreviation)', () => {
        mockLocale.value = 'uk'
        // 2024-09-15 in Ukrainian with month:'short': September abbreviation is 'вер.'
        const usedAt = new Date('2024-09-15T12:00:00Z')
        const wrapper = mount(PasskeyItem, { ...globalStubs, props: { passkey: makePasskey(usedAt) } })
        expect(wrapper.text()).toContain('вер.')
        expect(wrapper.text()).not.toContain('Sep')
    })
})
