import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TagView from '../TagView.vue'
import { Tag as TagModel } from '@/api/models/tag'
import { ChargeTotal } from '@/api/models/charge'
import { Pagination } from '@/api/models/pagination'

const mockReplace = vi.fn()

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
    useRouter: () => ({ replace: mockReplace }),
    useRoute: () => ({ params: { tagID: '1' }, query: {}, name: 'tags.show' }),
}))

vi.mock('@/api/tags', () => ({
    getTagById: vi.fn(),
    getTagCharges: vi.fn(),
    getTagTotals: vi.fn(),
    getCommonTags: vi.fn(),
}))

import { getTagById, getTagCharges, getTagTotals, getCommonTags } from '@/api/tags'

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

const makeGlobal = () => ({
    props: { tagID: '1' },
    global: {
        stubs: {
            WalletsActiveShortList: { template: '<div />' },
            // No `emits: ['click']` — the parent binds @click via fallthrough ($attrs).
            // Declaring emits would consume the event and prevent the parent handler from firing.
            TagChip: {
                template: '<button data-testid="tag-chip" v-bind="$attrs"></button>',
                props: ['tag', 'highlighted'],
            },
            Tag: {
                template: '<button data-testid="tag-chip" v-bind="$attrs"></button>',
                props: ['tag', 'highlighted'],
            },
            TotalsRow: { template: '<div />', props: ['loading', 'incomeAmount', 'expenseAmount', 'currency'] },
            ChargesFilter: { name: 'ChargesFilter', template: '<div />' },
            ChargeItem: { template: '<div />', props: ['charge', 'wallet'], emits: ['updated', 'deleted', 'tag-selected'] },
            TagChargesFlowChart: { template: '<div />', props: ['tagId', 'currency', 'filter'] },
            UButton: {
                template: '<button @click="$emit(\'click\')">{{ label }}</button>',
                props: ['label', 'icon', 'variant', 'color', 'size', 'loading', 'disabled'],
                emits: ['click'],
            },
            UAlert: { template: '<div />', props: ['color', 'description', 'icon', 'variant'] },
            UIcon: { template: '<span />', props: ['name', 'class'] },
            Icon: { template: '<span />', props: ['name', 'class'] },
            USkeleton: { template: '<div />', props: ['class'] },
            USeparator: { template: '<hr />' },
            Separator: { template: '<hr />' },
        },
    },
})

async function flushAll() {
    await flushPromises()
    await nextTick()
}

describe('TagView.vue', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockReplace.mockClear()

        const tag = makeTag({ id: 1, name: 'Food' })
        vi.mocked(getTagById).mockResolvedValue(tag)
        const emptyPagination = new Pagination({ page: 1, limit: 20, total: 0, totalPages: 1, hasNext: false, hasPrev: false })
        vi.mocked(getTagCharges).mockResolvedValue({ data: [], pagination: emptyPagination })
        vi.mocked(getTagTotals).mockResolvedValue(new ChargeTotal({ totalAmount: 0, totalIncomeAmount: 0, totalExpenseAmount: 0, currency: null }))
        vi.mocked(getCommonTags).mockResolvedValue([tag])
    })

    it('does not call router.replace on initial mount', async () => {
        mount(TagView, makeGlobal())
        await flushAll()

        expect(mockReplace).not.toHaveBeenCalled()
    })

    it('selectTag calls router.replace with tags.show and string tagID', async () => {
        const tag1 = makeTag({ id: 1, name: 'Food' })
        const tag2 = makeTag({ id: 5, name: 'Travel' })
        vi.mocked(getTagById).mockResolvedValue(tag2)
        vi.mocked(getCommonTags).mockResolvedValue([tag1, tag2])

        const wrapper = mount(TagView, makeGlobal())
        await flushAll()

        // Simulate clicking a different tag chip in the common tags cloud.
        // The chips are rendered by the TagChip stub with data-testid="tag-chip".
        // We need to trigger selectTag(5). The header also renders a TagChip so
        // the indices are: chips[0] = header chip (current tag id=1), chips[1] = first
        // common tag (tag1 id=1, guard fires — same), chips[2] = second common tag (tag2 id=5).
        const chips = wrapper.findAll('[data-testid="tag-chip"]')
        expect(chips.length).toBeGreaterThanOrEqual(3)
        await chips[2].trigger('click')
        await flushAll()

        expect(mockReplace).toHaveBeenCalledExactlyOnceWith({
            name: 'tags.show',
            params: { tagID: '5' },
        })
    })

    it('selectTag with the same id does not call router.replace', async () => {
        const tag1 = makeTag({ id: 1, name: 'Food' })
        vi.mocked(getCommonTags).mockResolvedValue([tag1])

        const wrapper = mount(TagView, makeGlobal())
        await flushAll()

        const chips = wrapper.findAll('[data-testid="tag-chip"]')
        // tag1 has id=1 which matches initial selectedTagId — the guard `if (id === selectedTagId.value) return` fires
        await chips[0].trigger('click')
        await flushAll()

        expect(mockReplace).not.toHaveBeenCalled()
    })

    it('selectTag does not double-fetch when tagID prop change echoes back', async () => {
        const tag1 = makeTag({ id: 1, name: 'Food' })
        const tag2 = makeTag({ id: 7, name: 'Work' })
        vi.mocked(getTagById).mockResolvedValue(tag2)
        vi.mocked(getCommonTags).mockResolvedValue([tag1, tag2])

        const wrapper = mount(TagView, makeGlobal())
        await flushAll()

        const callsBefore = vi.mocked(getTagById).mock.calls.length

        // Simulate external navigation to tagID='7' (e.g. from router.replace fired by selectTag).
        // The watcher fires, sees newId !== selectedTagId, calls selectTag(7).
        // selectTag sets selectedTagId=7 and calls router.replace.
        await wrapper.setProps({ tagID: '7' })
        await flushAll()

        const callsAfterFirst = vi.mocked(getTagById).mock.calls.length
        expect(callsAfterFirst - callsBefore).toBe(1)

        // Now simulate the router echoing the same prop again (tagID='7').
        // The watcher should detect selectedTagId is already 7 and NOT re-fetch.
        await wrapper.setProps({ tagID: '7' })
        await flushAll()

        // No additional fetch should have occurred.
        const callsAfterSecond = vi.mocked(getTagById).mock.calls.length
        expect(callsAfterSecond - callsBefore).toBe(1)
    })

    it('load more button uses charges.loadMore key', async () => {
        const tag = makeTag({ id: 1, name: 'Food' })
        const paginationMultiPage = new Pagination({ page: 1, limit: 20, total: 40, totalPages: 2, hasNext: true, hasPrev: false })
        vi.mocked(getTagCharges).mockResolvedValue({ data: [], pagination: paginationMultiPage })
        vi.mocked(getCommonTags).mockResolvedValue([tag])

        const wrapper = mount(TagView, makeGlobal())
        await flushAll()

        expect(wrapper.text()).toContain('charges.loadMore')
        expect(wrapper.text()).not.toContain('charges.loadingMore')
    })

    it('watcher handles external navigation to a new tag URL', async () => {
        const tag1 = makeTag({ id: 1, name: 'Food' })
        const tag3 = makeTag({ id: 3, name: 'Work' })
        vi.mocked(getTagById).mockResolvedValue(tag3)
        vi.mocked(getCommonTags).mockResolvedValue([tag1, tag3])

        const wrapper = mount(TagView, makeGlobal())
        await flushAll()

        const callsBefore = vi.mocked(getTagById).mock.calls.length

        // Simulate browser back/forward changing the tagID prop without a selectTag call
        await wrapper.setProps({ tagID: '3' })
        await flushAll()

        expect(mockReplace).toHaveBeenCalledWith({
            name: 'tags.show',
            params: { tagID: '3' },
        })

        const callsAfter = vi.mocked(getTagById).mock.calls.length
        expect(callsAfter - callsBefore).toBe(1)
    })

    it('initial load failure shows error alert and hides empty state', async () => {
        vi.mocked(getTagCharges).mockRejectedValue(new Error('network error'))

        const wrapper = mount(TagView, makeGlobal())
        await flushAll()

        // UAlert stub renders with props passed as DOM attributes — check raw HTML.
        expect(wrapper.html()).toContain('charges.loadingError')

        // Empty state must NOT render while errorCharges is set
        expect(wrapper.text()).not.toContain('charges.empty')
    })

    it('retry after initial load failure resolves and shows charges', async () => {
        vi.mocked(getTagCharges).mockRejectedValueOnce(new Error('network error'))

        const wrapper = mount(TagView, makeGlobal())
        await flushAll()

        // Confirm error state via HTML (UAlert stub exposes description as attribute)
        expect(wrapper.html()).toContain('charges.loadingError')

        // Make next call succeed
        const emptyPagination = new Pagination({ page: 1, limit: 20, total: 0, totalPages: 1, hasNext: false, hasPrev: false })
        vi.mocked(getTagCharges).mockResolvedValueOnce({ data: [], pagination: emptyPagination })

        // Find and click the retry UButton. The UButton stub emits 'click' when triggered.
        // The retry button contains 'retry' (the i18n key returned by mocked t()).
        const allButtons = wrapper.findAll('button')
        const retryButton = allButtons.find(b => b.text().includes('retry'))
        expect(retryButton).toBeDefined()
        await retryButton!.trigger('click')
        await flushAll()

        // Error alert should be gone
        expect(wrapper.html()).not.toContain('charges.loadingError')

        // Empty state should now render (charges resolved to [])
        expect(wrapper.text()).toContain('charges.empty')
    })

    it('filter change with failing request shows error alert', async () => {
        // Initial load succeeds; set up rejection for subsequent calls
        vi.mocked(getTagCharges)
            .mockResolvedValueOnce({
                data: [],
                pagination: new Pagination({ page: 1, limit: 20, total: 0, totalPages: 1, hasNext: false, hasPrev: false }),
            })
            .mockRejectedValue(new Error('filter error'))

        const wrapper = mount(TagView, makeGlobal())
        await flushAll()

        // No error yet
        expect(wrapper.html()).not.toContain('charges.loadingError')

        // Open the filters panel so ChargesFilter enters the DOM
        const filterToggle = wrapper.findAll('button').find(b => b.text().includes('wallets.filters'))
        expect(filterToggle).toBeDefined()
        await filterToggle!.trigger('click')
        await nextTick()

        // The ChargesFilter stub has name: 'ChargesFilter' so findComponent works.
        const filterStub = wrapper.findComponent({ name: 'ChargesFilter' })
        expect(filterStub.exists()).toBe(true)
        await filterStub.vm.$emit('filter-change', { dateFrom: '2024-01-01', dateTo: '' })
        await flushAll()

        // Error alert for charges must appear
        expect(wrapper.html()).toContain('charges.loadingError')
    })
})
