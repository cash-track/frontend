import { describe, it, expect, vi } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import { Tag as TagModel } from '@/api/models/tag'
import TagComponent from '../Tag.vue'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mockPush }),
}))

function makeTag(overrides: Partial<{
    id: number
    color: string | null
    icon: string | null
    name: string
}> = {}): TagModel {
    return new TagModel({
        id: overrides.id ?? 1,
        name: overrides.name ?? 'Food',
        icon: overrides.icon ?? null,
        color: overrides.color ?? null,
        userId: 42,
        createdAt: new Date(),
        updatedAt: new Date(),
    })
}

describe('Tag.vue', () => {
    it('renders tag name', () => {
        const tag = makeTag({ name: 'Travel' })
        const wrapper = mount(TagComponent, { props: { tag } })
        expect(wrapper.text()).toContain('Travel')
    })

    it('renders icon when present', () => {
        const tag = makeTag({ icon: '✈️' })
        const wrapper = mount(TagComponent, { props: { tag } })
        expect(wrapper.text()).toContain('✈️')
    })

    it('sets backgroundColor style when tag has a hex color', () => {
        const tag = makeTag({ color: '#ff5733' })
        const wrapper = mount(TagComponent, { props: { tag } })
        const style = wrapper.find('button').attributes('style') ?? ''
        expect(style).toContain('background-color')
    })

    it('does not set background-color style when color is null', () => {
        const tag = makeTag({ color: null })
        const wrapper = mount(TagComponent, { props: { tag } })
        const style = wrapper.find('button').attributes('style') ?? ''
        expect(style).not.toContain('background-color')
    })

    it('shows X icon when removable is true', () => {
        const tag = makeTag()
        const wrapper = shallowMount(TagComponent, { props: { tag, removable: true } })
        expect(wrapper.find('icon-stub').exists()).toBe(true)
    })

    it('does not show X icon when removable is false', () => {
        const tag = makeTag()
        const wrapper = shallowMount(TagComponent, { props: { tag, removable: false } })
        expect(wrapper.find('icon-stub').exists()).toBe(false)
    })

    it('navigates to tags.show on click when navigable is true', async () => {
        mockPush.mockClear()
        const tag = makeTag({ id: 7 })
        const wrapper = mount(TagComponent, { props: { tag, navigable: true } })
        await wrapper.find('button').trigger('click')
        expect(mockPush).toHaveBeenCalledWith({ name: 'tags.show', params: { tagID: 7 } })
    })

    it('does not navigate on click when navigable is false (default)', async () => {
        mockPush.mockClear()
        const tag = makeTag({ id: 7 })
        const wrapper = mount(TagComponent, { props: { tag } })
        await wrapper.find('button').trigger('click')
        expect(mockPush).not.toHaveBeenCalled()
    })
})
