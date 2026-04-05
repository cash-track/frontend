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

vi.mock('@/composables/useNotifications', () => ({
    useNotifications: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
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
            UButton: {
                template: '<button :disabled="disabled || loading" @click="$emit(\'click\')">{{ label }}</button>',
                props: ['label', 'loading', 'disabled', 'variant', 'color'],
                emits: ['click'],
            },
            ProfileAvatar: { template: '<div class="avatar-stub" />', props: ['user'] },
        },
    },
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

    it('renders file input', () => {
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
        const file = new File(['photo-content'], 'photo.jpg', { type: 'image/jpeg' })

        const input = document.createElement('input')
        Object.defineProperty(input, 'files', { value: [file] })

        const vm = wrapper.vm as unknown as {
            onFileChange: (e: Event) => void
            onUpload: () => Promise<void>
        }

        vm.onFileChange({ target: input } as unknown as Event)
        await vm.onUpload()

        expect(mockUploadPhoto).toHaveBeenCalledWith(file)
    })

    it('calls updatePhotoUrl with the returned URL after upload', async () => {
        const photoUrl = 'https://example.com/photo.jpg'
        mockUploadPhoto.mockResolvedValue({ message: 'OK', fileName: 'photo.jpg', url: photoUrl })

        const wrapper = mount(ProfilePhoto, globalStubs)
        const file = new File(['photo-content'], 'photo.jpg', { type: 'image/jpeg' })

        const input = document.createElement('input')
        Object.defineProperty(input, 'files', { value: [file] })

        const vm = wrapper.vm as unknown as {
            onFileChange: (e: Event) => void
            onUpload: () => Promise<void>
        }

        vm.onFileChange({ target: input } as unknown as Event)
        await vm.onUpload()

        expect(mockUpdatePhotoUrl).toHaveBeenCalledWith(photoUrl)
    })

    it('clears selected file after successful upload', async () => {
        mockUploadPhoto.mockResolvedValue({ message: 'OK', fileName: 'photo.jpg', url: 'https://example.com/photo.jpg' })

        const wrapper = mount(ProfilePhoto, globalStubs)
        const file = new File(['photo-content'], 'photo.jpg', { type: 'image/jpeg' })

        const input = document.createElement('input')
        Object.defineProperty(input, 'files', { value: [file] })

        const vm = wrapper.vm as unknown as {
            onFileChange: (e: Event) => void
            onUpload: () => Promise<void>
            selectedFile: File | null
        }

        vm.onFileChange({ target: input } as unknown as Event)
        await vm.onUpload()

        expect(vm.selectedFile).toBeNull()
    })

    it('does not call uploadPhoto when no file selected', async () => {
        const wrapper = mount(ProfilePhoto, globalStubs)
        const vm = wrapper.vm as unknown as { onUpload: () => Promise<void> }
        await vm.onUpload()
        expect(mockUploadPhoto).not.toHaveBeenCalled()
    })
})
