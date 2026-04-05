import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError } from 'axios'
import type { User } from '@/api/models/user'
import ProfileSettings from '../ProfileSettings.vue'

const { mockUpdateProfile, mockCheckNickName, mockGetFeaturedCurrencies, mockSetProfile } = vi.hoisted(() => ({
    mockUpdateProfile: vi.fn(),
    mockCheckNickName: vi.fn(),
    mockGetFeaturedCurrencies: vi.fn(),
    mockSetProfile: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string, args?: unknown[]) => args ? `${key}:${args.join(',')}` : key,
        locale: ref('en'),
    }),
}))

vi.mock('@/api/profile', () => ({
    updateProfile: mockUpdateProfile,
    checkNickName: mockCheckNickName,
}))

vi.mock('@/api/currency', () => ({
    getFeaturedCurrencies: mockGetFeaturedCurrencies,
}))

vi.mock('@/composables/useNotifications', () => ({
    useNotifications: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}))

const mockUser: User = {
    id: 1,
    name: 'Alice',
    lastName: 'Smith',
    nickName: 'alice',
    email: 'alice@example.com',
    isEmailConfirmed: true,
    photoUrl: null,
    defaultCurrencyCode: 'USD',
    defaultCurrency: null,
    locale: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    displayName: 'Alice Smith',
} as unknown as User

vi.mock('@/stores/profile', () => ({
    useProfileStore: () => ({
        profile: ref(mockUser),
        setProfile: mockSetProfile,
        updatePhotoUrl: vi.fn(),
    }),
}))

vi.mock('@/stores/locale', () => ({
    useLocaleStore: () => ({ locale: ref('en'), localeChange: vi.fn() }),
}))

vi.mock('@/lang', () => ({
    locales: [
        { code: 'en', name: '🇺🇸 English', flag: '🇺🇸' },
        { code: 'uk', name: '🇺🇦 Українська', flag: '🇺🇦' },
    ],
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
                template: '<input :value="modelValue" @blur="$emit(\'blur\')" @input="$emit(\'update:modelValue\', $event.target.value)" />',
                props: ['modelValue', 'disabled', 'class'],
                emits: ['update:modelValue', 'blur'],
            },
            USelect: {
                template: '<select />',
                props: ['modelValue', 'items', 'disabled', 'class'],
                emits: ['update:modelValue'],
            },
            UButton: {
                template: '<button :disabled="disabled || loading" @click="$emit(\'click\')">{{ label }}</button>',
                props: ['label', 'loading', 'disabled', 'variant', 'color', 'icon'],
                emits: ['click'],
            },
            UAlert: { template: '<div>{{ description }}</div>', props: ['color', 'description', 'icon'] },
        },
    },
}

describe('ProfileSettings', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        mockGetFeaturedCurrencies.mockResolvedValue([])
    })

    it('initializes form from profile store', () => {
        const wrapper = mount(ProfileSettings, globalStubs)
        const vm = wrapper.vm as unknown as { form: { name: string; nickName: string; locale: string } }
        expect(vm.form.name).toBe('Alice')
        expect(vm.form.nickName).toBe('alice')
        expect(vm.form.locale).toBe('en')
    })

    it('calls checkNickName on blur when nickName has changed', async () => {
        mockCheckNickName.mockResolvedValue(undefined)
        const wrapper = mount(ProfileSettings, globalStubs)
        const vm = wrapper.vm as unknown as { form: { nickName: string }; onNickNameBlur: () => Promise<void> }

        vm.form.nickName = 'new-nick'
        await vm.onNickNameBlur()

        expect(mockCheckNickName).toHaveBeenCalledWith('new-nick')
    })

    it('does not call checkNickName when nickName is unchanged', async () => {
        const wrapper = mount(ProfileSettings, globalStubs)
        const vm = wrapper.vm as unknown as { form: { nickName: string }; onNickNameBlur: () => Promise<void> }

        vm.form.nickName = 'alice' // same as mockUser.nickName
        await vm.onNickNameBlur()

        expect(mockCheckNickName).not.toHaveBeenCalled()
    })

    it('does not call checkNickName when nickName is empty', async () => {
        const wrapper = mount(ProfileSettings, globalStubs)
        const vm = wrapper.vm as unknown as { form: { nickName: string }; onNickNameBlur: () => Promise<void> }

        vm.form.nickName = ''
        await vm.onNickNameBlur()

        expect(mockCheckNickName).not.toHaveBeenCalled()
    })

    it('shows field error when checkNickName returns 422', async () => {
        const axiosError = new AxiosError('Validation failed')
        axiosError.response = {
            status: 422,
            data: { errors: { nickName: ['Nick name is already taken'] } },
            headers: {},
            config: {} as never,
            statusText: 'Unprocessable Entity',
        }
        mockCheckNickName.mockRejectedValue(axiosError)

        const wrapper = mount(ProfileSettings, globalStubs)
        const vm = wrapper.vm as unknown as {
            form: { nickName: string }
            onNickNameBlur: () => Promise<void>
            fieldErrors: Record<string, string[]>
        }

        vm.form.nickName = 'taken-nick'
        await vm.onNickNameBlur()

        expect(vm.fieldErrors.nickName?.[0]).toBe('Nick name is already taken')
    })

    it('calls updateProfile with form data on submit', async () => {
        mockUpdateProfile.mockResolvedValue(mockUser)

        const wrapper = mount(ProfileSettings, globalStubs)
        const vm = wrapper.vm as unknown as { onSubmit: () => Promise<void> }
        await vm.onSubmit()

        expect(mockUpdateProfile).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Alice',
                nickName: 'alice',
                defaultCurrencyCode: 'USD',
                locale: 'en',
            }),
        )
    })

    it('calls profileStore.setProfile after successful save', async () => {
        mockUpdateProfile.mockResolvedValue(mockUser)

        const wrapper = mount(ProfileSettings, globalStubs)
        const vm = wrapper.vm as unknown as { onSubmit: () => Promise<void> }
        await vm.onSubmit()

        expect(mockSetProfile).toHaveBeenCalledWith(mockUser)
    })

    it('converts empty lastName to null on submit', async () => {
        mockUpdateProfile.mockResolvedValue(mockUser)

        const wrapper = mount(ProfileSettings, globalStubs)
        const vm = wrapper.vm as unknown as { form: { lastName: string }; onSubmit: () => Promise<void> }
        vm.form.lastName = ''
        await vm.onSubmit()

        expect(mockUpdateProfile).toHaveBeenCalledWith(
            expect.objectContaining({ lastName: null }),
        )
    })
})
