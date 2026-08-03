import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { shallowMount, flushPromises } from '@vue/test-utils'
import TagFormInput from '../TagFormInput.vue'
import { Tag } from '@/api/models/tag'
import { getWalletTags, searchWalletTags } from '@/api/tags'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

vi.mock('@/api/tags', () => ({
    getWalletTags: vi.fn().mockResolvedValue([]),
    searchWalletTags: vi.fn().mockResolvedValue([]),
}))

function makeTag(id: number, name: string): Tag {
    return new Tag({
        id,
        name,
        icon: null,
        color: '#123456',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
    })
}

const stubs = {
    UInput: { template: '<div><slot name="trailing" /></div>' },
    UIcon: { template: '<span />', props: ['name', 'class'] },
    TagChip: { template: '<div />', props: ['tag', 'highlighted'] },
}

describe('TagFormInput', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // A synchronous `selected` listener mirroring LimitForm/ChargeCreate/ChargeEdit.
    // Vue calls emit listeners synchronously, so the `tags` prop update lands
    // before onSelect()'s own nextTick() re-check runs — a bare setProps() after
    // onSelect() returns would schedule its flush too late to reproduce production
    // ordering.
    function mountInputWithParent(initialTags: Tag[] = []) {
        let currentTags = initialTags
        const wrapper = shallowMount(TagFormInput, {
            props: {
                walletId: 1,
                tags: currentTags,
                onSelected: (tag: Tag) => {
                    currentTags = [...currentTags, tag]
                    wrapper.setProps({ tags: currentTags })
                },
            },
            global: { stubs },
        })
        return wrapper
    }

    // Issue #155: clicking a suggestion chip directly (no search text typed) must
    // not hide the dropdown while other unselected tags are still suggested —
    // mirrors the anti-auto-hide rule already covering ChargeTitleFormInput (#109).
    describe('auto-hide rule (issue #155)', () => {
        it('stays open after selecting a suggestion when another unselected tag remains', async () => {
            const tagA = makeTag(1, 'Groceries')
            const tagB = makeTag(2, 'Transport')
            vi.mocked(getWalletTags).mockResolvedValue([tagA, tagB])

            const wrapper = mountInputWithParent()
            const vm = wrapper.vm as unknown as {
                dropdownOpen: boolean
                onFocus: () => void
                onSelect: (tag: Tag) => void
            }

            await flushPromises()
            vm.onFocus()
            await nextTick()
            expect(vm.dropdownOpen).toBe(true)

            vm.onSelect(tagA)
            await flushPromises()

            expect(vm.dropdownOpen).toBe(true)
            expect(wrapper.emitted('selected')?.[0]).toEqual([tagA])
        })

        it('closes once the last unselected suggestion is picked', async () => {
            const tagA = makeTag(1, 'Groceries')
            vi.mocked(getWalletTags).mockResolvedValue([tagA])

            const wrapper = mountInputWithParent()
            const vm = wrapper.vm as unknown as {
                dropdownOpen: boolean
                onFocus: () => void
                onSelect: (tag: Tag) => void
            }

            await flushPromises()
            vm.onFocus()
            await nextTick()
            expect(vm.dropdownOpen).toBe(true)

            vm.onSelect(tagA)
            await flushPromises()

            expect(vm.dropdownOpen).toBe(false)
        })

        it('stays open after selecting a search result when another unselected match remains', async () => {
            vi.useFakeTimers()
            try {
                const tagA = makeTag(1, 'Groceries')
                const tagB = makeTag(2, 'Gas')
                // Suggestions and search both draw from the same wallet tag pool in
                // production (getWalletTags / searchWalletTags), so keep them in sync.
                vi.mocked(getWalletTags).mockResolvedValue([tagA, tagB])
                vi.mocked(searchWalletTags).mockResolvedValue([tagA, tagB])

                const wrapper = mountInputWithParent()
                const vm = wrapper.vm as unknown as {
                    dropdownOpen: boolean
                    query: string
                    onSelect: (tag: Tag) => void
                }

                await flushPromises()
                vm.query = 'g'
                await vi.advanceTimersByTimeAsync(300)

                expect(vm.dropdownOpen).toBe(true)

                vm.onSelect(tagA)
                await vi.advanceTimersByTimeAsync(0)
                await flushPromises()

                expect(vm.dropdownOpen).toBe(true)
            } finally {
                vi.useRealTimers()
            }
        })
    })
})
