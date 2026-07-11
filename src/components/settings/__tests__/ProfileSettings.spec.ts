import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError } from 'axios'
import type { User } from '@/api/models/user'
import ProfileSettings from '../ProfileSettings.vue'

const { mockUpdateProfile, mockCheckNickName, mockGetSocial, mockGetFeaturedCurrencies, mockSetProfile } = vi.hoisted(() => ({
    mockUpdateProfile: vi.fn(),
    mockCheckNickName: vi.fn(),
    mockGetSocial: vi.fn(),
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
    getSocial: mockGetSocial,
}))

vi.mock('@/api/currency', () => ({
    getFeaturedCurrencies: mockGetFeaturedCurrencies,
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
    default: {
        global: {
            t: (key: string) => key,
        },
    },
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
            UBadge: { template: '<span><slot /></span>', props: ['color', 'variant'] },
            Badge: { template: '<span><slot /></span>', props: ['color', 'variant'] },
            USkeleton: { template: '<div class="skeleton" />', props: ['class'] },
            Skeleton: { template: '<div class="skeleton" />', props: ['class'] },
            USeparator: { template: '<hr />' },
            Separator: { template: '<hr />' },
            UTooltip: { template: '<span><slot /></span>', props: ['text', 'arrow'] },
            Tooltip: { template: '<span><slot /></span>', props: ['text', 'arrow'] },
            UIcon: { template: '<span />', props: ['name', 'class'] },
            Icon: { template: '<span />', props: ['name', 'class'] },
            UButton: {
                template: '<button :disabled="disabled || loading" @click="$emit(\'click\')">{{ label }}</button>',
                props: ['label', 'loading', 'disabled', 'variant', 'color', 'icon'],
                emits: ['click'],
            },
            UAlert: {
                template: '<div>{{ description }}</div>',
                props: ['color', 'description', 'icon', 'close'],
                emits: ['update:open'],
            },
        },
    },
}

describe('ProfileSettings', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        mockGetFeaturedCurrencies.mockResolvedValue([])
        mockGetSocial.mockResolvedValue({ google: false })
    })

    it('initializes form from profile store', () => {
        const wrapper = mount(ProfileSettings, globalStubs)
        const vm = wrapper.vm as unknown as { form: { name: string; nickName: string; locale: string } }
        expect(vm.form.name).toBe('Alice')
        expect(vm.form.nickName).toBe('alice')
        expect(vm.form.locale).toBe('en')
    })

    it('loads Google social connection state on mount', async () => {
        mockGetSocial.mockResolvedValue({ google: true })
        const wrapper = mount(ProfileSettings, globalStubs)
        await flushPromises()
        const vm = wrapper.vm as unknown as { isGoogleEnabled: boolean }
        expect(mockGetSocial).toHaveBeenCalled()
        expect(vm.isGoogleEnabled).toBe(true)
    })

    it('shows skeleton while social is loading', () => {
        let resolve: (v: { google: boolean }) => void
        mockGetSocial.mockImplementation(() => new Promise(r => { resolve = r }))
        const wrapper = mount(ProfileSettings, globalStubs)
        expect(wrapper.find('.skeleton').exists()).toBe(true)
        expect(wrapper.text()).not.toContain('profileSettings.googleConnected')
        expect(wrapper.text()).not.toContain('profileSettings.googleNotConnected')
        // keep ts happy; resolve is assigned synchronously inside the mock
        resolve!({ google: false })
    })

    it('shows connected badge when google is true', async () => {
        mockGetSocial.mockResolvedValue({ google: true })
        const wrapper = mount(ProfileSettings, globalStubs)
        await flushPromises()
        expect(wrapper.find('.skeleton').exists()).toBe(false)
        expect(wrapper.text()).toContain('profileSettings.googleConnected')
        expect(wrapper.text()).not.toContain('profileSettings.googleNotConnected')
    })

    it('shows not-connected badge when google is false', async () => {
        mockGetSocial.mockResolvedValue({ google: false })
        const wrapper = mount(ProfileSettings, globalStubs)
        await flushPromises()
        expect(wrapper.find('.skeleton').exists()).toBe(false)
        expect(wrapper.text()).toContain('profileSettings.googleNotConnected')
        expect(wrapper.text()).not.toContain('profileSettings.googleConnected')
    })

    it('shows socialLoadError when getSocial rejects', async () => {
        mockGetSocial.mockRejectedValue(new Error('network'))
        const wrapper = mount(ProfileSettings, globalStubs)
        await flushPromises()
        expect(wrapper.find('.skeleton').exists()).toBe(false)
        expect(wrapper.text()).toContain('profileSettings.socialLoadError')
        expect(wrapper.text()).not.toContain('profileSettings.googleConnected')
        expect(wrapper.text()).not.toContain('profileSettings.googleNotConnected')
        expect(wrapper.findComponent({ name: 'UBadge' }).exists()).toBe(false)
    })

    it('debounced nickName check fires checkNickName after the delay when changed', async () => {
        vi.useFakeTimers()
        mockCheckNickName.mockResolvedValue(undefined)
        try {
            const wrapper = mount(ProfileSettings, globalStubs)
            const vm = wrapper.vm as unknown as { form: { nickName: string }; isNickNameValid: boolean | null }

            vm.form.nickName = 'new-nick'
            await nextTick()
            await vi.advanceTimersByTimeAsync(1000)

            expect(mockCheckNickName).toHaveBeenCalledWith('new-nick')
            expect(vm.isNickNameValid).toBe(true)
        } finally {
            vi.useRealTimers()
        }
    })

    it('does not check nickName when unchanged from profile', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(ProfileSettings, globalStubs)
            const vm = wrapper.vm as unknown as { form: { nickName: string } }

            vm.form.nickName = 'alice' // same as mockUser.nickName
            await nextTick()
            await vi.advanceTimersByTimeAsync(1000)

            expect(mockCheckNickName).not.toHaveBeenCalled()
        } finally {
            vi.useRealTimers()
        }
    })

    it('does not check nickName when empty', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(ProfileSettings, globalStubs)
            const vm = wrapper.vm as unknown as { form: { nickName: string } }

            vm.form.nickName = ''
            await nextTick()
            await vi.advanceTimersByTimeAsync(1000)

            expect(mockCheckNickName).not.toHaveBeenCalled()
        } finally {
            vi.useRealTimers()
        }
    })

    it('marks nickName invalid and sets field error when checkNickName returns 422', async () => {
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
            validateNickName: (n: string) => Promise<void>
            isNickNameValid: boolean | null
            fieldErrors: Record<string, string[]>
        }

        await vm.validateNickName('taken-nick')

        expect(vm.isNickNameValid).toBe(false)
        expect(vm.fieldErrors.nickName?.[0]).toBe('Nick name is already taken')
    })

    it('clears the nickName field error when the value returns to its original', async () => {
        const wrapper = mount(ProfileSettings, globalStubs)
        const vm = wrapper.vm as unknown as {
            form: { nickName: string }
            fieldErrors: Record<string, string[]>
        }

        vm.form.nickName = 'temp' // change away first so the watcher fires on the way back
        await nextTick()
        vm.fieldErrors = { nickName: ['Nick name is already taken'] }
        vm.form.nickName = 'alice' // back to mockUser.nickName
        await nextTick()

        expect(vm.fieldErrors.nickName).toBeUndefined()
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

    it('calls profileStore.setProfile and shows success message after successful save', async () => {
        mockUpdateProfile.mockResolvedValue(mockUser)

        const wrapper = mount(ProfileSettings, globalStubs)
        const vm = wrapper.vm as unknown as { onSubmit: () => Promise<void>; successMessage: string }
        await vm.onSubmit()

        expect(mockSetProfile).toHaveBeenCalledWith(mockUser)
        expect(vm.successMessage).toBe('profileSettings.success')
    })

    it('shows LoadErrorAlert (no retry) and no plain UAlert for a non-422 updateProfile failure', async () => {
        mockUpdateProfile.mockRejectedValue(new Error('network error'))

        const wrapper = mount(ProfileSettings, globalStubs)
        const vm = wrapper.vm as unknown as { onSubmit: () => Promise<void> }
        await vm.onSubmit()
        await nextTick()

        const alert = wrapper.findComponent({ name: 'LoadErrorAlert' })
        expect(alert.exists()).toBe(true)
        expect(alert.props('retryable')).toBeFalsy()
        // The stubbed plain UAlert only renders for the 422 branch (generalError without generalErrorRaw)
        expect(wrapper.text()).not.toContain('validationError')
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
