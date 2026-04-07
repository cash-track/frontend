import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError } from 'axios'
import SecuritySettings from '../SecuritySettings.vue'

const { mockUpdatePassword, mockNotifySuccess } = vi.hoisted(() => ({
    mockUpdatePassword: vi.fn(),
    mockNotifySuccess: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

vi.mock('@/api/profile/password', () => ({
    updatePassword: mockUpdatePassword,
}))

vi.mock('@/composables/useNotifications', () => ({
    useNotifications: () => ({ notifySuccess: mockNotifySuccess, notifyError: vi.fn() }),
}))

const globalStubs = {
    global: {
        stubs: {
            UCard: { template: '<div><slot name="header" /><slot /><slot name="footer" /></div>' },
            UFormField: {
                template: '<div><slot /></div>',
                props: ['label', 'description', 'error', 'required'],
            },
            UInput: {
                template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
                props: ['modelValue', 'disabled', 'type', 'class'],
                emits: ['update:modelValue', 'change'],
            },
            UButton: {
                template: '<button :disabled="disabled || loading" @click="$emit(\'click\')">{{ label }}</button>',
                props: ['label', 'loading', 'disabled'],
                emits: ['click'],
            },
            UAlert: { template: '<div>{{ description }}</div>', props: ['color', 'description', 'icon'] },
        },
    },
}

describe('SecuritySettings', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('does not submit when newPassword is shorter than 6 characters', async () => {
        const wrapper = mount(SecuritySettings, globalStubs)
        const vm = wrapper.vm as unknown as {
            form: { currentPassword: string; newPassword: string; newPasswordConfirmation: string }
            onSubmit: () => Promise<void>
        }

        vm.form.currentPassword = 'oldpass'
        vm.form.newPassword = 'abc'
        vm.form.newPasswordConfirmation = 'abc'
        await vm.onSubmit()

        expect(mockUpdatePassword).not.toHaveBeenCalled()
    })

    it('does not submit when newPassword and confirmation do not match', async () => {
        const wrapper = mount(SecuritySettings, globalStubs)
        const vm = wrapper.vm as unknown as {
            form: { currentPassword: string; newPassword: string; newPasswordConfirmation: string }
            onSubmit: () => Promise<void>
        }

        vm.form.currentPassword = 'oldpass'
        vm.form.newPassword = 'newpass123'
        vm.form.newPasswordConfirmation = 'differentpass'
        await vm.onSubmit()

        expect(mockUpdatePassword).not.toHaveBeenCalled()
    })

    it('calls updatePassword with correct payload on valid submit', async () => {
        mockUpdatePassword.mockResolvedValue(undefined)

        const wrapper = mount(SecuritySettings, globalStubs)
        const vm = wrapper.vm as unknown as {
            form: { currentPassword: string; newPassword: string; newPasswordConfirmation: string }
            onSubmit: () => Promise<void>
        }

        vm.form.currentPassword = 'oldpass'
        vm.form.newPassword = 'newpass123'
        vm.form.newPasswordConfirmation = 'newpass123'
        await vm.onSubmit()

        expect(mockUpdatePassword).toHaveBeenCalledWith({
            currentPassword: 'oldpass',
            newPassword: 'newpass123',
            newPasswordConfirmation: 'newpass123',
        })
    })

    it('shows success notification and resets form after successful submit', async () => {
        mockUpdatePassword.mockResolvedValue(undefined)

        const wrapper = mount(SecuritySettings, globalStubs)
        const vm = wrapper.vm as unknown as {
            form: { currentPassword: string; newPassword: string; newPasswordConfirmation: string }
            onSubmit: () => Promise<void>
        }

        vm.form.currentPassword = 'oldpass'
        vm.form.newPassword = 'newpass123'
        vm.form.newPasswordConfirmation = 'newpass123'
        await vm.onSubmit()

        expect(mockNotifySuccess).toHaveBeenCalledWith('securitySettings.success')
        expect(vm.form.currentPassword).toBe('')
        expect(vm.form.newPassword).toBe('')
        expect(vm.form.newPasswordConfirmation).toBe('')
    })

    it('shows general error when API call fails', async () => {
        const axiosError = new AxiosError('Unauthorized')
        axiosError.response = {
            status: 422,
            data: { errors: { currentPassword: ['Current password is incorrect'] } },
            headers: {},
            config: {} as never,
            statusText: 'Unprocessable Entity',
        }
        mockUpdatePassword.mockRejectedValue(axiosError)

        const wrapper = mount(SecuritySettings, globalStubs)
        const vm = wrapper.vm as unknown as {
            form: { currentPassword: string; newPassword: string; newPasswordConfirmation: string }
            onSubmit: () => Promise<void>
            fieldErrors: Record<string, string[]>
        }

        vm.form.currentPassword = 'wrongpass'
        vm.form.newPassword = 'newpass123'
        vm.form.newPasswordConfirmation = 'newpass123'
        await vm.onSubmit()

        expect(vm.fieldErrors.currentPassword?.[0]).toBe('Current password is incorrect')
    })
})
