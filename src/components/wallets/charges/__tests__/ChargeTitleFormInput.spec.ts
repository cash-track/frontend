import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import ChargeTitleFormInput from '../ChargeTitleFormInput.vue'
import { Tag } from '@/api/models/tag'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

vi.mock('@/api/charges', () => ({
    getChargeTitles: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/api/tags', () => ({
    getTagSuggestions: vi.fn().mockResolvedValue([]),
}))

describe('ChargeTitleFormInput', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    function mountInput(modelValue = '') {
        return shallowMount(ChargeTitleFormInput, {
            props: { modelValue, tags: [] },
            global: {
                stubs: {
                    // Render attrs on the stub root so we can assert them via html()
                    UInput: {
                        template: '<div class="uinput-stub" v-bind="$attrs"><slot /></div>',
                        inheritAttrs: false,
                        setup(_, { attrs }) {
                            return { attrs }
                        },
                    },
                    UIcon: { template: '<span />', props: ['name', 'class'] },
                    TagChip: { template: '<div />', props: ['tag', 'highlighted', 'id'] },
                    UBadge: { template: '<span><slot /></span>', props: ['variant', 'color', 'size'] },
                },
            },
        })
    }

    it('UInput stub receives role="combobox"', () => {
        const wrapper = mountInput()
        // With inheritAttrs: false and explicit binding the attrs are on the stub root
        expect(wrapper.html()).toContain('role="combobox"')
    })

    it('UInput stub receives aria-expanded="false" when dropdown is closed', () => {
        const wrapper = mountInput()
        expect(wrapper.html()).toContain('aria-expanded="false"')
    })

    it('UInput stub receives aria-autocomplete="list"', () => {
        const wrapper = mountInput()
        expect(wrapper.html()).toContain('aria-autocomplete="list"')
    })

    it('UInput stub receives aria-controls pointing to the listbox id', () => {
        const wrapper = mountInput()
        expect(wrapper.html()).toContain('aria-controls="charge-title-listbox"')
    })

    it('aria-expanded becomes "true" when dropdown opens', async () => {
        const wrapper = mountInput()
        const vm = wrapper.vm as unknown as { dropdownOpen: boolean }
        vm.dropdownOpen = true
        await nextTick()
        expect(wrapper.html()).toContain('aria-expanded="true"')
    })

    it('dropdown container has role="listbox" when open', async () => {
        const wrapper = mountInput('Groc')
        const vm = wrapper.vm as unknown as { dropdownOpen: boolean }
        vm.dropdownOpen = true
        await nextTick()

        const listbox = wrapper.find('[role="listbox"]')
        expect(listbox.exists()).toBe(true)
    })

    it('title suggestion buttons have role="option"', async () => {
        const wrapper = mountInput('Cof')
        const vm = wrapper.vm as unknown as {
            dropdownOpen: boolean
            titleSuggestions: Array<{ title: string; count: number }>
        }
        vm.dropdownOpen = true
        vm.titleSuggestions = [{ title: 'Coffee', count: 2 }]
        await nextTick()

        const options = wrapper.findAll('[role="option"]')
        expect(options.length).toBeGreaterThan(0)
    })

    it('aria-activedescendant is absent when no item is highlighted', () => {
        const wrapper = mountInput()
        const html = wrapper.html()
        // highlightedIndex starts at -1 → no activedescendant
        expect(html).not.toContain('aria-activedescendant="charge-title-option')
    })

    it('aria-activedescendant points to highlighted title option id', async () => {
        const wrapper = mountInput('Cof')
        const vm = wrapper.vm as unknown as {
            dropdownOpen: boolean
            highlightedIndex: number
            titleSuggestions: Array<{ title: string; count: number }>
        }
        vm.dropdownOpen = true
        vm.titleSuggestions = [{ title: 'Coffee', count: 2 }]
        vm.highlightedIndex = 0
        await nextTick()

        // 0 tags + index 0 → charge-title-option-title-0
        expect(wrapper.html()).toContain('aria-activedescendant="charge-title-option-title-0"')
    })

    it('aria-activedescendant uses flat index when both tag and title suggestions are present', async () => {
        const wrapper = mountInput('Co')
        const vm = wrapper.vm as unknown as {
            dropdownOpen: boolean
            highlightedIndex: number
            tagSuggestions: Tag[]
            titleSuggestions: Array<{ title: string; count: number }>
        }

        vm.dropdownOpen = true
        // 2 tag suggestions occupy flat indices 0 and 1
        vm.tagSuggestions = [
            new Tag({ id: 10, name: 'coffee', icon: null, color: '#ff0000', userId: 1, createdAt: new Date(), updatedAt: new Date() }),
            new Tag({ id: 11, name: 'cola', icon: null, color: '#00ff00', userId: 1, createdAt: new Date(), updatedAt: new Date() }),
        ]
        // 1 title suggestion occupies flat index 2 (filteredTagSuggestions.length + 0 = 2)
        vm.titleSuggestions = [{ title: 'Coffee', count: 3 }]
        // Highlight the title option at flat index 2
        vm.highlightedIndex = 2
        await nextTick()

        // flat index 2 → charge-title-option-title-2
        expect(wrapper.html()).toContain('aria-activedescendant="charge-title-option-title-2"')
    })

    describe('stale-response guard (loadToken)', () => {
        afterEach(() => {
            vi.useRealTimers()
        })

        it('older request resolving after newer request does not overwrite newer suggestions', async () => {
            vi.useFakeTimers()

            // Per-call resolvers so we control resolve order manually
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let resolveOldTitles!: (v: any) => void
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let resolveNewTitles!: (v: any) => void

            const oldTitleData = [{ title: 'OldResult', count: 1 }]
            const newTitleData = [{ title: 'NewResult', count: 5 }]

            const { getChargeTitles } = await import('@/api/charges')
            const { getTagSuggestions } = await import('@/api/tags')
            const mockGetChargeTitles = vi.mocked(getChargeTitles)
            const mockGetTagSuggestions = vi.mocked(getTagSuggestions)

            // Both requests resolve tags immediately (empty); titles are deferred
            mockGetTagSuggestions.mockResolvedValue([])
            mockGetChargeTitles
                .mockImplementationOnce(() => new Promise(res => { resolveOldTitles = res }))
                .mockImplementationOnce(() => new Promise(res => { resolveNewTitles = res }))

            const wrapper = mountInput()
            const vm = wrapper.vm as unknown as {
                titleSuggestions: Array<{ title: string; count: number }>
                doAutocomplete: (v: string) => void
                reset: () => void
            }

            // Fire first ("old") request
            vm.doAutocomplete('old')
            await vi.advanceTimersByTimeAsync(300)

            // Fire second ("new") request — this bumps loadToken inside the timeout
            vm.doAutocomplete('new')
            await vi.advanceTimersByTimeAsync(300)

            // Resolve NEW request first, then OLD (the out-of-order scenario)
            resolveNewTitles(newTitleData)
            await Promise.resolve()
            await nextTick()

            resolveOldTitles(oldTitleData)
            await Promise.resolve()
            await nextTick()

            // Old response must be ignored; suggestions must reflect the NEW query
            expect(vm.titleSuggestions).toEqual(newTitleData)
        })

        it('in-flight response is ignored after reset() is called', async () => {
            vi.useFakeTimers()

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let resolveInFlight!: (v: any) => void
            const staleTitleData = [{ title: 'Stale', count: 3 }]

            const { getChargeTitles } = await import('@/api/charges')
            const { getTagSuggestions } = await import('@/api/tags')
            const mockGetChargeTitles = vi.mocked(getChargeTitles)
            const mockGetTagSuggestions = vi.mocked(getTagSuggestions)

            mockGetTagSuggestions.mockResolvedValue([])
            mockGetChargeTitles.mockImplementationOnce(
                () => new Promise(res => { resolveInFlight = res }),
            )

            const wrapper = mountInput()
            const vm = wrapper.vm as unknown as {
                titleSuggestions: Array<{ title: string; count: number }>
                doAutocomplete: (v: string) => void
                reset: () => void
            }

            // Start an in-flight request
            vm.doAutocomplete('query')
            await vi.advanceTimersByTimeAsync(300)

            // Reset before the response arrives — bumps loadToken
            vm.reset()

            // Late resolution of the in-flight request must be ignored
            resolveInFlight(staleTitleData)
            await Promise.resolve()
            await nextTick()

            expect(vm.titleSuggestions).toEqual([])
        })
    })
})
