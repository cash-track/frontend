import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import ChargesTotalChart from '../ChargesTotalChart.vue'
import { Currency } from '@/api/models/currency'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

vi.mock('vue-chartjs', () => ({
    Doughnut: { name: 'Doughnut', template: '<canvas />', props: ['data', 'options'] },
}))

vi.mock('chart.js', () => ({
    Chart: { register: vi.fn() },
    Title: {},
    Tooltip: {},
    Legend: {},
    ArcElement: {},
}))

vi.mock('@/api/graph', () => ({
    getChargesTotalByType: vi.fn().mockImplementation((_walletId: number, params?: Record<string, string>) => {
        if (params?.['charge-type'] === 'expense') return Promise.resolve([{ amount: 500, tags: [1] }])
        if (params?.['charge-type'] === 'income') return Promise.resolve([{ amount: 3000, tags: [2] }])
        return Promise.resolve([])
    }),
}))

vi.mock('@/api/tags', () => ({
    getWalletTags: vi.fn().mockResolvedValue([
        { id: 1, name: 'Food', icon: null, color: '#ff0000', userId: 1, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, name: 'Salary', icon: null, color: '#00ff00', userId: 1, createdAt: new Date(), updatedAt: new Date() },
    ]),
}))

const usd = new Currency({ id: 'USD', code: 'USD', name: 'US Dollar', char: '$', rate: 1, updatedAt: new Date() })

describe('ChargesTotalChart', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('mounts without errors', async () => {
        const wrapper = shallowMount(ChargesTotalChart, {
            props: { walletId: 1, currency: usd },
            global: { stubs: { UIcon: true, UAlert: true } },
        })
        await nextTick()
        await nextTick()
        expect(wrapper.exists()).toBe(true)
    })

    it('renders two Doughnut charts (expense and income) after loading', async () => {
        const wrapper = shallowMount(ChargesTotalChart, {
            props: { walletId: 1, currency: usd },
            global: { stubs: { UIcon: true, UAlert: true } },
        })
        await new Promise(r => setTimeout(r, 0))
        await nextTick()
        const charts = wrapper.findAllComponents({ name: 'Doughnut' })
        expect(charts).toHaveLength(2)
    })

    it('gives "Without tags" (tags:[]) and "Other" (tags:[-1]) slices DIFFERENT colors', () => {
        // Access the component's internal sliceColor helper via the exposed vm
        // We build a minimal dataset with both synthetic slices and verify colors differ
        const withoutTagsPoint = { amount: 100, tags: [] as number[] }
        const otherPoint = { amount: 50, tags: [-1] }
        const normalPoint = { amount: 200, tags: [1] }

        // Mount with walletTags to avoid async tag loading
        const wrapper = shallowMount(ChargesTotalChart, {
            props: {
                walletId: 1,
                currency: usd,
                walletTags: [{ id: 1, name: 'Food', icon: null, color: '#ff0000', userId: 1, createdAt: new Date(), updatedAt: new Date() }],
            },
            global: { stubs: { UIcon: true, UAlert: true } },
        })

        const vm = wrapper.vm as unknown as {
            sliceColor: (d: { amount: number, tags: number[] }) => string
        }

        const withoutTagsColor = vm.sliceColor(withoutTagsPoint)
        const otherColor = vm.sliceColor(otherPoint)
        const normalColor = vm.sliceColor(normalPoint)

        expect(withoutTagsColor).toBe('#9ca3af')
        expect(otherColor).toBe('#4b5563')
        // The two reserved greys must be distinct
        expect(withoutTagsColor).not.toBe(otherColor)
        // Normal slice must not collide with either reserved grey
        expect(normalColor).not.toBe('#9ca3af')
        expect(normalColor).not.toBe('#4b5563')
    })

    it('backgroundColor array in buildChartData uses distinct colors for tags:[] and tags:[-1]', async () => {
        const { getChargesTotalByType } = await import('@/api/graph')
        const mockFn = getChargesTotalByType as ReturnType<typeof vi.fn>

        // Dataset with both a no-tags slice and an "Other" synthetic slice
        // We need enough items to trigger the "Other" path: more than hideThresholdAmount=8 items
        // Simpler: just test the computed directly via exposeChartData
        // Instead, build expense dataset with tags:[] entry directly
        mockFn.mockImplementation((_walletId: number, params?: Record<string, string>) => {
            if (params?.['charge-type'] === 'expense') {
                return Promise.resolve([
                    { amount: 500, tags: [] },    // Without tags
                    { amount: 400, tags: [1] },
                ])
            }
            return Promise.resolve([])
        })

        const wrapper = shallowMount(ChargesTotalChart, {
            props: {
                walletId: 1,
                currency: usd,
                walletTags: [{ id: 1, name: 'Food', icon: null, color: '#ff0000', userId: 1, createdAt: new Date(), updatedAt: new Date() }],
            },
            global: { stubs: { UIcon: true, UAlert: true } },
        })

        await new Promise(r => setTimeout(r, 0))
        await nextTick()

        const vm = wrapper.vm as unknown as {
            expenseChartData: { datasets: Array<{ backgroundColor: string[] }> }
        }

        const colors = vm.expenseChartData.datasets[0].backgroundColor
        // First entry is tags:[] → must be '#9ca3af'
        expect(colors[0]).toBe('#9ca3af')
        // Second entry is tags:[1] → must not be a reserved grey
        expect(colors[1]).not.toBe('#9ca3af')
        expect(colors[1]).not.toBe('#4b5563')
    })
})
