import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { shallowMount, flushPromises } from '@vue/test-utils'
import ChargeTitleFormInput from '../ChargeTitleFormInput.vue'
import { Tag } from '@/api/models/tag'
import { getChargeTitles } from '@/api/charges'
import { getTagSuggestions } from '@/api/tags'

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

function makeTagSuggestion(id: number, name: string): Tag {
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

describe('ChargeTitleFormInput', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const stubs = {
        // Render attrs on the stub root so we can assert them via html()
        UInput: {
            template: '<div class="uinput-stub" v-bind="$attrs"><slot /></div>',
            inheritAttrs: false,
            setup(_: unknown, { attrs }: { attrs: Record<string, unknown> }) {
                return { attrs }
            },
        },
        UIcon: { template: '<span />', props: ['name', 'class'] },
        TagChip: { template: '<div />', props: ['tag', 'highlighted', 'id'] },
        UBadge: { template: '<span><slot /></span>', props: ['variant', 'color', 'size'] },
    }

    function mountInput(modelValue = '') {
        return shallowMount(ChargeTitleFormInput, {
            props: { modelValue, tags: [] },
            global: { stubs },
        })
    }

    // A synchronous `tag-selected` listener mirroring ChargeCreate/ChargeEdit.
    // Vue calls emit listeners synchronously, so the `tags` prop update lands
    // before the component's deferred nextTick() re-check — a bare setProps()
    // after onTagSelect() returns schedules its flush too late to reproduce it.
    function mountInputWithParent(modelValue: string, initialTags: Tag[] = []) {
        let currentTags = initialTags
        const wrapper = shallowMount(ChargeTitleFormInput, {
            props: {
                modelValue,
                tags: currentTags,
                onTagSelected: (tag: Tag) => {
                    currentTags = [tag, ...currentTags]
                    wrapper.setProps({ tags: currentTags })
                },
            },
            global: { stubs },
        })
        return wrapper
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

    it('emits dropdown-open-change whenever the internal dropdownOpen ref toggles', async () => {
        // Ancestors (e.g. a UCollapsible with overflow-hidden) rely on this event to
        // temporarily allow overflow while the suggestions listbox is open — see
        // WalletView.vue's titleAutocompleteOpen (issue #110).
        const wrapper = mountInput()
        const vm = wrapper.vm as unknown as { dropdownOpen: boolean }

        vm.dropdownOpen = true
        await nextTick()
        vm.dropdownOpen = false
        await nextTick()

        expect(wrapper.emitted('dropdown-open-change')).toEqual([[true], [false]])
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

    // Selecting a partial suggestion (typed "Sho", clicked "Shop") must not
    // flicker the dropdown closed-then-open while the reload runs.
    describe('anti-flicker + auto-hide rule (issue #109)', () => {
        afterEach(() => {
            vi.useRealTimers()
        })

        it('stays open after selecting a partial title suggestion, through the inline reload', async () => {
            vi.useFakeTimers()
            vi.mocked(getTagSuggestions).mockResolvedValue([])
            vi.mocked(getChargeTitles).mockResolvedValue([
                { title: 'Shop', count: 1 },
                { title: 'Shopping', count: 2 },
            ])

            const wrapper = mountInput('Sho')
            const vm = wrapper.vm as unknown as {
                dropdownOpen: boolean
                doAutocomplete: (v: string) => void
                onTitleSelect: (title: string) => void
            }

            // Type "Sho" — dropdown opens with both matches.
            vm.doAutocomplete('Sho')
            await vi.advanceTimersByTimeAsync(300)
            expect(vm.dropdownOpen).toBe(true)

            // The box must stay visible for the whole reload.
            vm.onTitleSelect('Shop')
            await nextTick()
            expect(vm.dropdownOpen).toBe(true)

            await vi.advanceTimersByTimeAsync(300)
            await nextTick()
            expect(vm.dropdownOpen).toBe(true)
        })

        it('never emits a false dropdown-open-change between selection and the reload settling', async () => {
            vi.useFakeTimers()
            vi.mocked(getTagSuggestions).mockResolvedValue([])
            vi.mocked(getChargeTitles).mockResolvedValue([
                { title: 'Shop', count: 1 },
                { title: 'Shopping', count: 2 },
            ])

            const wrapper = mountInput('Sho')
            const vm = wrapper.vm as unknown as {
                dropdownOpen: boolean
                doAutocomplete: (v: string) => void
                onTitleSelect: (title: string) => void
            }

            vm.doAutocomplete('Sho')
            await vi.advanceTimersByTimeAsync(300)

            vm.onTitleSelect('Shop')
            await nextTick()
            await vi.advanceTimersByTimeAsync(300)
            await nextTick()

            expect(vm.dropdownOpen).toBe(true)
            // A single `true` emission for the whole flow (open on the first
            // load) and never a `false` in between the selection and reload.
            expect(wrapper.emitted('dropdown-open-change')).toEqual([[true]])
        })

        it('auto-hides once the reload settles on a single exact title match with no tag suggestions', async () => {
            vi.useFakeTimers()
            vi.mocked(getTagSuggestions).mockResolvedValue([])
            vi.mocked(getChargeTitles).mockResolvedValue([
                { title: 'Shop', count: 1 },
                { title: 'Shopping', count: 2 },
            ])

            const wrapper = mountInput('Sho')
            const vm = wrapper.vm as unknown as {
                dropdownOpen: boolean
                doAutocomplete: (v: string) => void
                onTitleSelect: (title: string) => void
            }

            vm.doAutocomplete('Sho')
            await vi.advanceTimersByTimeAsync(300)
            expect(vm.dropdownOpen).toBe(true)

            // Selecting "Shop" narrows the reload down to a single exact match.
            vi.mocked(getChargeTitles).mockResolvedValue([{ title: 'Shop', count: 1 }])
            vm.onTitleSelect('Shop')
            await nextTick()
            // Simulate the parent re-binding v-model after the emit, as the
            // real ChargeCreate/ChargeEdit forms do.
            await wrapper.setProps({ modelValue: 'Shop' })
            await vi.advanceTimersByTimeAsync(300)
            await nextTick()

            expect(vm.dropdownOpen).toBe(false)
        })

        it('stays open when an unselected tag suggestion remains, even with a single exact title match', async () => {
            vi.useFakeTimers()
            const tagSuggestion = makeTagSuggestion(30, 'shopping')
            vi.mocked(getTagSuggestions).mockResolvedValue([])
            vi.mocked(getChargeTitles).mockResolvedValue([
                { title: 'Shop', count: 1 },
                { title: 'Shopping', count: 2 },
            ])

            const wrapper = mountInput('Sho')
            const vm = wrapper.vm as unknown as {
                dropdownOpen: boolean
                doAutocomplete: (v: string) => void
                onTitleSelect: (title: string) => void
            }

            vm.doAutocomplete('Sho')
            await vi.advanceTimersByTimeAsync(300)
            expect(vm.dropdownOpen).toBe(true)

            // Selecting "Shop" narrows titles to a single exact match, but an
            // unselected tag suggestion is still present — must stay open.
            vi.mocked(getTagSuggestions).mockResolvedValue([tagSuggestion])
            vi.mocked(getChargeTitles).mockResolvedValue([{ title: 'Shop', count: 1 }])
            vm.onTitleSelect('Shop')
            await nextTick()
            await wrapper.setProps({ modelValue: 'Shop' })
            await vi.advanceTimersByTimeAsync(300)
            await nextTick()

            expect(vm.dropdownOpen).toBe(true)
        })

        it('re-evaluates the hide rule on the lastQuery === q early-return path after onTagSelect', async () => {
            const tagSuggestion = makeTagSuggestion(31, 'shopping')

            const wrapper = mountInputWithParent('Shop')
            const vm = wrapper.vm as unknown as {
                dropdownOpen: boolean
                lastQuery: string
                tagSuggestions: Tag[]
                titleSuggestions: Array<{ title: string; count: number }>
                onTagSelect: (tag: Tag) => void
            }

            // Simulate a load already completed for the current text: one
            // unselected tag suggestion, and a single title that exactly
            // matches "Shop" (does not yet satisfy the hide rule, tag present).
            vm.lastQuery = 'Shop'
            vm.tagSuggestions = [tagSuggestion]
            vm.titleSuggestions = [{ title: 'Shop', count: 1 }]
            vm.dropdownOpen = true
            await nextTick()

            // Selecting the only remaining tag suggestion synchronously fires
            // the simulated parent's listener (removing it from `addedTagIds`
            // via the `tags` prop) before onTagSelect()'s own nextTick() call
            // is scheduled — reproducing production ordering. doAutocomplete()
            // then takes the lastQuery === q early-return branch (no new
            // request), but the hide rule must still be re-checked against the
            // now-filtered tag list.
            vm.onTagSelect(tagSuggestion)
            await flushPromises()

            expect(vm.dropdownOpen).toBe(false)
        })

        it('keeps a selected tag suggestion in the cache so it reappears if the chip is later removed', async () => {
            // Regression: onTagSelect() must not mutate `tagSuggestions`
            // directly. If it did, removing the tag afterwards via its chip
            // (ChargeCreate/ChargeEdit's onTagRemoved) would never bring the
            // suggestion back, because doAutocomplete()'s lastQuery === q
            // guard blocks any refetch while the typed text is unchanged.
            const tagSuggestion = makeTagSuggestion(32, 'shopping')

            const wrapper = mountInputWithParent('Shop')
            const vm = wrapper.vm as unknown as {
                lastQuery: string
                tagSuggestions: Tag[]
                titleSuggestions: Array<{ title: string; count: number }>
                filteredTagSuggestions: Tag[]
                onTagSelect: (tag: Tag) => void
            }

            vm.lastQuery = 'Shop'
            vm.tagSuggestions = [tagSuggestion]
            vm.titleSuggestions = []
            await nextTick()

            expect(vm.filteredTagSuggestions.map(t => t.id)).toEqual([32])

            // Select it — the simulated parent appends it to its own
            // `selectedTags` and passes the new array back down via `tags`.
            vm.onTagSelect(tagSuggestion)
            await flushPromises()

            expect(vm.filteredTagSuggestions).toEqual([])

            // Remove it via its chip — the parent drops it from
            // `selectedTags` without the typed text changing.
            await wrapper.setProps({ tags: [] })

            // The underlying suggestion cache must still contain the tag so
            // it reappears immediately, with no refetch involved.
            expect(vm.tagSuggestions.map(t => t.id)).toEqual([32])
            expect(vm.filteredTagSuggestions.map(t => t.id)).toEqual([32])
        })

        it('re-evaluates the hide rule when the clicked title suggestion matches the current text exactly', async () => {
            // localValue is already "Shop" — assigning the same value again is
            // a no-op for the ref, so the `localValue` watcher never fires.
            // onTitleSelect() must fall back to calling doAutocomplete()
            // directly so the lastQuery === q early-return path still re-runs
            // the hide check.
            const wrapper = mountInput('Shop')
            const vm = wrapper.vm as unknown as {
                dropdownOpen: boolean
                lastQuery: string
                tagSuggestions: Tag[]
                titleSuggestions: Array<{ title: string; count: number }>
                onTitleSelect: (title: string) => void
            }

            vm.lastQuery = 'Shop'
            vm.tagSuggestions = []
            vm.titleSuggestions = [{ title: 'Shop', count: 1 }]
            vm.dropdownOpen = true
            await nextTick()

            vm.onTitleSelect('Shop')
            await nextTick()

            expect(vm.dropdownOpen).toBe(false)
        })
    })
})
