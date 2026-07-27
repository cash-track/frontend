import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { CounterStats } from '@/api/profile'

const mockStats: CounterStats = {
    wallets: 5,
    walletsArchived: 2,
    charges: 100,
    chargesIncome: 40,
}

vi.mock('@/api/profile', () => ({
    getCounterStats: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}))

import { getCounterStats } from '@/api/profile'
import CountersStatistics from '../CountersStatistics.vue'

const globalStubs = {
    global: {
        stubs: {
            UCard: {
                template: '<div><slot name="header" /><slot /></div>',
            },
            UTooltip: {
                template: '<span><slot /></span>',
                props: ['text', 'arrow'],
            },
            Tooltip: {
                template: '<span><slot /></span>',
                props: ['text', 'arrow'],
            },
            // Nuxt UI's SFCs resolve by their bare filename-derived name, so the
            // U*-prefixed key alone lets the real component through. That matters
            // here: with the offline @iconify/vue alias and no icon data registered
            // in unit tests, the real UIcon renders nothing at all — taking its
            // class attribute (and this test's `.text-warning` target) with it.
            UIcon: true,
            Icon: true,
            USkeleton: true,
        },
    },
}

describe('CountersStatistics.vue', () => {
    it('renders wallet and charge counts after loading', async () => {
        vi.mocked(getCounterStats).mockResolvedValue(mockStats)

        const wrapper = mount(CountersStatistics, globalStubs)
        await flushPromises()

        expect(wrapper.text()).toContain('5')   // wallets
        expect(wrapper.text()).toContain('2')   // walletsArchived
        expect(wrapper.text()).toContain('100') // charges
        expect(wrapper.text()).toContain('40')  // chargesIncome
        expect(wrapper.text()).toContain('60')  // chargesExpense (100 - 40)
    })

    it('shows error icon when load fails', async () => {
        vi.mocked(getCounterStats).mockRejectedValue(new Error('fail'))

        const wrapper = mount(CountersStatistics, globalStubs)
        await flushPromises()

        expect(wrapper.find('.text-warning').exists()).toBe(true)
    })

    it('renders visible label text for each counter', async () => {
        vi.mocked(getCounterStats).mockResolvedValue(mockStats)

        const wrapper = mount(CountersStatistics, globalStubs)
        await flushPromises()

        expect(wrapper.text()).toContain('profile.totalWalletsAmount')
        expect(wrapper.text()).toContain('profile.archivedWalletsAmount')
        expect(wrapper.text()).toContain('profile.totalChargesAmount')
        expect(wrapper.text()).toContain('profile.incomeChargesAmount')
        expect(wrapper.text()).toContain('profile.expenseChargesAmount')
    })

    it('uses grid layout for counter rows', async () => {
        vi.mocked(getCounterStats).mockResolvedValue(mockStats)

        const wrapper = mount(CountersStatistics, globalStubs)
        await flushPromises()

        expect(wrapper.find('.grid-cols-2').exists()).toBe(true)
        expect(wrapper.find('.grid-cols-3').exists()).toBe(true)
    })
})
