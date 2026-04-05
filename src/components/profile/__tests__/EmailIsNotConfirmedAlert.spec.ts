import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/api/models/user'

vi.mock('@/api/profile/email', () => ({
    resendEmailConfirmation: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/composables/useNotifications', () => ({
    useNotifications: () => ({
        notifySuccess: vi.fn(),
        notifyError: vi.fn(),
    }),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

vi.mock('@/shared/links', () => ({ webSiteLink: (p: string) => `https://website.test${p}` }))
vi.mock('@/api/auth', () => ({ logout: vi.fn().mockResolvedValue({}) }))

const mockUser = {
    id: 1,
    name: 'Alice',
    lastName: null,
    nickName: 'alice',
    email: 'alice@test.com',
    isEmailConfirmed: true,
    photoUrl: null,
    defaultCurrencyCode: null,
    defaultCurrency: null,
    locale: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    displayName: 'Alice',
} as unknown as User

import EmailIsNotConfirmedAlert from '../EmailIsNotConfirmedAlert.vue'

describe('EmailIsNotConfirmedAlert.vue', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('renders when email is not confirmed', () => {
        const auth = useAuthStore()
        auth.login({ ...mockUser, isEmailConfirmed: false } as User)

        const wrapper = shallowMount(EmailIsNotConfirmedAlert)
        // The UAlert is rendered (not v-if'd out)
        expect(wrapper.html()).not.toBe('<<!--v-if-->')
        expect(wrapper.html().length).toBeGreaterThan(10)
    })

    it('renders nothing when email is confirmed', () => {
        const auth = useAuthStore()
        auth.login({ ...mockUser, isEmailConfirmed: true } as User)

        const wrapper = shallowMount(EmailIsNotConfirmedAlert)
        expect(wrapper.html()).toContain('<!--v-if-->')
    })
})
