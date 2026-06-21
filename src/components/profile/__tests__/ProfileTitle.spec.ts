import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfileTitle from '../ProfileTitle.vue'
import type { User } from '@/api/models/user'

const mockUser = {
    id: 1,
    name: 'Alice',
    lastName: 'Smith',
    nickName: 'alice',
    email: 'alice@example.com',
    isEmailConfirmed: true,
    photoUrl: null,
    defaultCurrencyCode: null,
    defaultCurrency: null,
    locale: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    displayName: 'Alice Smith',
} as unknown as User

describe('ProfileTitle.vue', () => {
    it('renders display name', () => {
        const wrapper = mount(ProfileTitle, { props: { user: mockUser } })
        expect(wrapper.text()).toContain('Alice Smith')
    })

    it('renders nickName with @ prefix', () => {
        const wrapper = mount(ProfileTitle, { props: { user: mockUser } })
        expect(wrapper.text()).toContain('@alice')
    })

    it('renders email', () => {
        const wrapper = mount(ProfileTitle, { props: { user: mockUser } })
        expect(wrapper.text()).toContain('alice@example.com')
    })
})
