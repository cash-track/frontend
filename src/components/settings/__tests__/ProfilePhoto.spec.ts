import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { User } from '@/api/models/user'
import ProfilePhoto from '../ProfilePhoto.vue'

const { mockUploadPhoto, mockUpdatePhotoUrl } = vi.hoisted(() => ({
    mockUploadPhoto: vi.fn(),
    mockUpdatePhotoUrl: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

vi.mock('@/api/profile', () => ({
    uploadPhoto: mockUploadPhoto,
}))

const mockUser: User = {
    id: 1,
    name: 'Alice',
    lastName: null,
    nickName: 'alice',
    email: 'alice@example.com',
    isEmailConfirmed: true,
    photoUrl: null,
    defaultCurrencyCode: null,
    defaultCurrency: null,
    locale: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    displayName: 'Alice',
} as unknown as User

vi.mock('@/stores/profile', () => ({
    useProfileStore: () => ({
        profile: ref(mockUser),
        updatePhotoUrl: mockUpdatePhotoUrl,
    }),
}))

const globalStubs = {
    global: {
        stubs: {
            UCard: { template: '<div><slot name="header" /><slot /><slot name="footer" /></div>' },
            UFormField: {
                template: '<div><slot /></div>',
                props: ['label', 'description'],
            },
            UFileUpload: {
                template: '<input type="file" />',
                props: ['modelValue', 'accept', 'variant', 'label', 'description', 'disabled', 'class'],
                emits: ['update:modelValue'],
            },
            FileUpload: {
                template: '<input type="file" />',
                props: ['modelValue', 'accept', 'variant', 'label', 'description', 'disabled', 'class'],
                emits: ['update:modelValue'],
            },
            UButton: {
                template: '<button :disabled="disabled || loading" @click="$emit(\'click\')">{{ label }}</button>',
                props: ['label', 'loading', 'disabled', 'variant', 'color'],
                emits: ['click'],
            },
            UAlert: {
                template: '<div>{{ description }}</div>',
                props: ['color', 'description', 'icon', 'close'],
                emits: ['update:open'],
            },
            ProfileAvatar: { template: '<div class="avatar-stub" />', props: ['user'] },
        },
    },
}

function makeFile() {
    return new File(['photo-content'], 'photo.jpg', { type: 'image/jpeg' })
}

describe('ProfilePhoto', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('renders profile avatar when profile is loaded', () => {
        const wrapper = mount(ProfilePhoto, globalStubs)
        expect(wrapper.find('.avatar-stub').exists()).toBe(true)
    })

    it('renders file upload input', () => {
        const wrapper = mount(ProfilePhoto, globalStubs)
        expect(wrapper.find('input[type="file"]').exists()).toBe(true)
    })

    it('save button is disabled when no file is selected', () => {
        const wrapper = mount(ProfilePhoto, globalStubs)
        const saveBtn = wrapper.findAll('button').find(b => b.text().includes('profilePhoto.save'))
        expect(saveBtn?.attributes('disabled')).toBeDefined()
    })

    it('calls uploadPhoto with the selected file', async () => {
        mockUploadPhoto.mockResolvedValue({ message: 'OK', fileName: 'photo.jpg', url: 'https://example.com/photo.jpg' })

        const wrapper = mount(ProfilePhoto, globalStubs)
        const vm = wrapper.vm as unknown as { selectedFile: File | null; onUpload: () => Promise<void> }

        vm.selectedFile = makeFile()
        await vm.onUpload()

        expect(mockUploadPhoto).toHaveBeenCalledWith(expect.any(File))
    })

    it('calls updatePhotoUrl and shows success message after upload', async () => {
        const photoUrl = 'https://example.com/photo.jpg'
        mockUploadPhoto.mockResolvedValue({ message: 'OK', fileName: 'photo.jpg', url: photoUrl })

        const wrapper = mount(ProfilePhoto, globalStubs)
        const vm = wrapper.vm as unknown as {
            selectedFile: File | null
            onUpload: () => Promise<void>
            successMessage: string
        }

        vm.selectedFile = makeFile()
        await vm.onUpload()

        expect(mockUpdatePhotoUrl).toHaveBeenCalledWith(photoUrl)
        expect(vm.successMessage).toBe('profilePhoto.success')
    })

    it('clears selected file after successful upload', async () => {
        mockUploadPhoto.mockResolvedValue({ message: 'OK', fileName: 'photo.jpg', url: 'https://example.com/photo.jpg' })

        const wrapper = mount(ProfilePhoto, globalStubs)
        const vm = wrapper.vm as unknown as {
            selectedFile: File | null
            onUpload: () => Promise<void>
        }

        vm.selectedFile = makeFile()
        await vm.onUpload()

        expect(vm.selectedFile).toBeNull()
    })

    it('shows an inline error message when upload fails', async () => {
        mockUploadPhoto.mockRejectedValue(new Error('boom'))

        const wrapper = mount(ProfilePhoto, globalStubs)
        const vm = wrapper.vm as unknown as {
            selectedFile: File | null
            onUpload: () => Promise<void>
            errorMessage: string
        }

        vm.selectedFile = makeFile()
        await vm.onUpload()

        expect(vm.errorMessage).toBe('unknownError')
    })

    it('does not call uploadPhoto when no file selected', async () => {
        const wrapper = mount(ProfilePhoto, globalStubs)
        const vm = wrapper.vm as unknown as { onUpload: () => Promise<void> }
        await vm.onUpload()
        expect(mockUploadPhoto).not.toHaveBeenCalled()
    })
})
