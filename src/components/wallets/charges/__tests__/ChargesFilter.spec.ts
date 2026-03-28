import { describe, it, expect, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { CalendarDate } from '@internationalized/date'
import ChargesFilter from '../ChargesFilter.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

const globalStubs = {
    global: {
        stubs: {
            UInputDate: true,
            UBadge: true,
            UIcon: true,
        },
    },
}

describe('ChargesFilter', () => {
    it('emits filter-change when dateFrom changes', async () => {
        const wrapper = mount(ChargesFilter, globalStubs)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vm = wrapper.vm as any
        vm.dateFrom = new CalendarDate(2025, 1, 1)
        await nextTick()

        const events = wrapper.emitted('filter-change')
        expect(events).toBeTruthy()

        const lastEvent = events![events!.length - 1][0] as { dateFrom: string; dateTo: string }
        expect(lastEvent.dateFrom).toBe('2025-01-01')
        expect(lastEvent.dateTo).toBe('')
    })

    it('emits filter-change when dateTo changes', async () => {
        const wrapper = mount(ChargesFilter, globalStubs)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vm = wrapper.vm as any
        vm.dateTo = new CalendarDate(2025, 12, 31)
        await nextTick()

        const events = wrapper.emitted('filter-change')
        expect(events).toBeTruthy()

        const lastEvent = events![events!.length - 1][0] as { dateFrom: string; dateTo: string }
        expect(lastEvent.dateTo).toBe('2025-12-31')
    })

    it('emits filter-change with both dates when both are set', async () => {
        const wrapper = mount(ChargesFilter, globalStubs)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vm = wrapper.vm as any
        vm.dateFrom = new CalendarDate(2025, 1, 1)
        await nextTick()

        vm.dateTo = new CalendarDate(2025, 12, 31)
        await nextTick()

        const events = wrapper.emitted('filter-change')
        expect(events).toBeTruthy()

        const lastEvent = events![events!.length - 1][0] as { dateFrom: string; dateTo: string }
        expect(lastEvent.dateFrom).toBe('2025-01-01')
        expect(lastEvent.dateTo).toBe('2025-12-31')
    })
})
