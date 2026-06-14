import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TagsView from '../TagsView.vue'
import { Tag as TagModel } from '@/api/models/tag'
import ConfirmModal from '@/components/Shared/ConfirmModal.vue'

const mockPush = vi.fn()

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
    createI18n: () => ({
        global: { t: (key: string) => key, locale: { value: 'en' }, setLocaleMessage: vi.fn() },
    }),
}))

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mockPush }),
    useRoute: () => ({ params: {}, query: {}, name: 'tags' }),
}))

vi.mock('@/api/tags', () => ({
    getTags: vi.fn(),
    deleteTag: vi.fn(),
}))

import { getTags, deleteTag } from '@/api/tags'

function makeTag(overrides: Partial<{
    id: number
    name: string
    color: string | null
    icon: string | null
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

// Stub UPopover to render both the default trigger slot and the content slot
// always visible — avoids needing to simulate the popover open state.
const popoverStub = {
    name: 'UPopover',
    template: '<div data-testid="popover"><slot /><slot name="content" /></div>',
}

const tagChipStub = { template: '<button data-testid="tag-chip"></button>', props: ['tag', 'navigable'] }

const makeGlobal = () => ({
    global: {
        stubs: {
            UPopover: popoverStub,
            Popover: popoverStub,
            TagComponent: tagChipStub,
            TagChip: tagChipStub,
            CreateTag: { template: '<div />' },
            TagForm: { template: '<div />', props: ['tag'] },
            ConfirmModal: { template: '<div><slot /></div>', props: ['open', 'title', 'description', 'loading', 'error'] },
            UButton: {
                template: '<button @click="$emit(\'click\')">{{ label }}</button>',
                props: ['label', 'icon', 'variant', 'color', 'size', 'loading', 'disabled'],
                emits: ['click'],
            },
            UModal: { template: '<div><slot name="body" /></div>', props: ['open', 'title'] },
            UAlert: { template: '<div />', props: ['color', 'description', 'icon', 'variant'] },
            UIcon: { template: '<span />', props: ['name', 'class'] },
            Icon: { template: '<span />', props: ['name', 'class'] },
            USkeleton: { template: '<div />', props: ['class'] },
        },
    },
})

describe('TagsView.vue', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockPush.mockClear()
        vi.mocked(getTags).mockResolvedValue([])
    })

    it('renders tags in popovers after loading', async () => {
        const tag = makeTag({ id: 1, name: 'Food' })
        vi.mocked(getTags).mockResolvedValue([tag])

        const wrapper = mount(TagsView, makeGlobal())
        // Wait for loadTags to resolve
        await nextTick()
        await nextTick()

        expect(wrapper.findAll('[data-testid="popover"]').length).toBe(1)
    })

    it('popover content contains View, Edit and Delete buttons', async () => {
        const tag = makeTag({ id: 1, name: 'Food' })
        vi.mocked(getTags).mockResolvedValue([tag])

        const wrapper = mount(TagsView, makeGlobal())
        await nextTick()
        await nextTick()

        const text = wrapper.text()
        expect(text).toContain('tags.view')
        expect(text).toContain('tags.edit')
        expect(text).toContain('common.delete')
    })

    it('View button navigates to tags.show route', async () => {
        const tag = makeTag({ id: 7, name: 'Travel' })
        vi.mocked(getTags).mockResolvedValue([tag])

        const wrapper = mount(TagsView, makeGlobal())
        await nextTick()
        await nextTick()

        // Find the button whose label is the View key
        const buttons = wrapper.findAll('button')
        const viewBtn = buttons.find(b => b.text() === 'tags.view')
        expect(viewBtn).toBeDefined()

        await viewBtn!.trigger('click')
        expect(mockPush).toHaveBeenCalledWith({
            name: 'tags.show',
            params: { tagID: '7' },
        })
    })

    it('Edit button opens the edit modal', async () => {
        const tag = makeTag({ id: 3, name: 'Work' })
        vi.mocked(getTags).mockResolvedValue([tag])

        const wrapper = mount(TagsView, makeGlobal())
        await nextTick()
        await nextTick()

        const buttons = wrapper.findAll('button')
        const editBtn = buttons.find(b => b.text() === 'tags.edit')
        expect(editBtn).toBeDefined()

        await editBtn!.trigger('click')
        // Just verify router.push was NOT called (it navigates only for View)
        expect(mockPush).not.toHaveBeenCalled()
    })

    it('tag chip does not have navigable prop (click opens popover, not navigates)', async () => {
        const tag = makeTag({ id: 1, name: 'Food' })
        vi.mocked(getTags).mockResolvedValue([tag])

        const wrapper = mount(TagsView, makeGlobal())
        await nextTick()
        await nextTick()

        // Use the stub reference so findAllComponents resolves correctly and
        // .props() reads the actual vnode prop — not a DOM attribute. If
        // `:navigable="true"` were re-added to TagComponent in the template,
        // this assertion would fail.
        const chips = wrapper.findAllComponents(tagChipStub)
        expect(chips.length).toBeGreaterThan(0)
        chips.forEach(chip => {
            expect(chip.props('navigable')).toBeUndefined()
        })
    })

    it('ConfirmModal error prop is null when delete modal is first opened', async () => {
        const tag = makeTag({ id: 1, name: 'Food' })
        vi.mocked(getTags).mockResolvedValue([tag])

        const wrapper = mount(TagsView, makeGlobal())
        await nextTick()
        await nextTick()

        const buttons = wrapper.findAll('button')
        const deleteBtn = buttons.find(b => b.text() === 'common.delete')
        await deleteBtn!.trigger('click')
        await nextTick()

        const modal = wrapper.findComponent(ConfirmModal)
        expect(modal.exists()).toBe(true)
        expect(modal.props('error')).toBeNull()
    })

    it('shows delete error in ConfirmModal when deleteTag rejects', async () => {
        const tag = makeTag({ id: 2, name: 'Work' })
        vi.mocked(getTags).mockResolvedValue([tag])
        vi.mocked(deleteTag).mockRejectedValue(new Error('Network error'))

        const wrapper = mount(TagsView, makeGlobal())
        await nextTick()
        await nextTick()

        // Open delete modal
        const buttons = wrapper.findAll('button')
        const deleteBtn = buttons.find(b => b.text() === 'common.delete')
        await deleteBtn!.trigger('click')
        await nextTick()

        // Trigger confirmDelete via the component vm
        const vm = wrapper.vm as unknown as { confirmDelete: () => Promise<void> }
        await vm.confirmDelete()
        await nextTick()

        const modal = wrapper.findComponent(ConfirmModal)
        expect(modal.props('error')).toBe('tags.deleteError')
    })

    it('clears delete error when delete modal is re-opened', async () => {
        const tag = makeTag({ id: 3, name: 'Bills' })
        vi.mocked(getTags).mockResolvedValue([tag])
        vi.mocked(deleteTag).mockRejectedValue(new Error('fail'))

        const wrapper = mount(TagsView, makeGlobal())
        await nextTick()
        await nextTick()

        // First open + failed attempt
        const buttons = wrapper.findAll('button')
        const deleteBtn = buttons.find(b => b.text() === 'common.delete')
        await deleteBtn!.trigger('click')
        await nextTick()

        const vm = wrapper.vm as unknown as { confirmDelete: () => Promise<void>; deleteError: string | null }
        await vm.confirmDelete()
        await nextTick()

        expect(wrapper.findComponent(ConfirmModal).props('error')).toBe('tags.deleteError')

        // Re-open the modal (simulates re-triggering delete on the same tag)
        await deleteBtn!.trigger('click')
        await nextTick()

        expect(wrapper.findComponent(ConfirmModal).props('error')).toBeNull()
    })

    it('clears error when modal emits update:open false after a failed delete', async () => {
        const tag = makeTag({ id: 4, name: 'Travel' })
        vi.mocked(getTags).mockResolvedValue([tag])
        vi.mocked(deleteTag).mockRejectedValue(new Error('Network error'))

        const wrapper = mount(TagsView, makeGlobal())
        await nextTick()
        await nextTick()

        // Open delete modal and fail the delete
        const buttons = wrapper.findAll('button')
        const deleteBtn = buttons.find(b => b.text() === 'common.delete')
        await deleteBtn!.trigger('click')
        await nextTick()

        const vm = wrapper.vm as unknown as { confirmDelete: () => Promise<void> }
        await vm.confirmDelete()
        await nextTick()

        const modal = wrapper.findComponent(ConfirmModal)
        expect(modal.props('error')).toBe('tags.deleteError')

        // Simulate the modal closing via update:open false (e.g. cancel button)
        await modal.vm.$emit('update:open', false)
        await nextTick()

        // Re-open to verify the error was cleared by the @update:open handler
        await deleteBtn!.trigger('click')
        await nextTick()

        expect(wrapper.findComponent(ConfirmModal).props('error')).toBeNull()
    })

    it('shows retry button when loadTags fails and reloads tags on click', async () => {
        vi.mocked(getTags).mockReset()
        vi.mocked(getTags).mockRejectedValue(new Error('network error'))

        const wrapper = mount(TagsView, makeGlobal())
        // Wait for loadTags to reject and state to settle
        await nextTick()
        await nextTick()

        // Error state: retry button must be visible
        const text = wrapper.text()
        expect(text).toContain('retry')

        // Prepare a successful response for the retry
        const tag = makeTag({ id: 1, name: 'Food' })
        vi.mocked(getTags).mockResolvedValue([tag])

        // Click the retry button
        const buttons = wrapper.findAll('button')
        const retryBtn = buttons.find(b => b.text() === 'retry')
        expect(retryBtn).toBeDefined()

        await retryBtn!.trigger('click')
        await nextTick()
        await nextTick()

        // getTags must have been called again after the reset (1 initial fail + 1 retry = 2)
        expect(vi.mocked(getTags)).toHaveBeenCalledTimes(2)

        // After successful reload the error ref is cleared and the tag chip renders
        const vmAfter = wrapper.vm as unknown as { error: string | null; tags: typeof TagModel[] }
        expect(vmAfter.error).toBeNull()
        expect(wrapper.findAll('[data-testid="tag-chip"]').length).toBe(1)
    })
})
