import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import TagChargesFlowChart from '../TagChargesFlowChart.vue'
import { Currency } from '@/api/models/currency'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
    }),
}))

vi.mock('@/composables/useMoneyFormatter', () => ({
    useMoneyFormatter: () => ({
        format: (amt: number, _cur: unknown, showFraction = true) =>
            showFraction ? amt.toFixed(2) : String(Math.round(amt)),
    }),
}))

vi.mock('vue-chartjs', () => ({
    Bar: { name: 'Bar', template: '<canvas />', props: ['data', 'options'] },
}))

vi.mock('chart.js', () => ({
    Chart: { register: vi.fn() },
    Title: {},
    Tooltip: {},
    Legend: {},
    BarElement: {},
    CategoryScale: {},
    LinearScale: {},
}))

const mockGetTagChargesFlow = vi.fn()

vi.mock('@/api/graph', () => ({
    getTagChargesFlow: (...args: unknown[]) => mockGetTagChargesFlow(...args),
}))

const usd = new Currency({ id: 'USD', code: 'USD', name: 'US Dollar', char: '$', rate: 1, updatedAt: new Date() })

const nonZeroData = [
    { date: '2025-01-01', timestamp: 1735689600, income: 500, expense: 300 },
    { date: '2025-01-02', timestamp: 1735776000, income: 0, expense: 200 },
]

const zeroData = [
    { date: '2025-01-01', timestamp: 1735689600, income: 0, expense: 0 },
    { date: '2025-01-02', timestamp: 1735776000, income: 0, expense: 0 },
]

describe('TagChargesFlowChart', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('mounts without errors', async () => {
        mockGetTagChargesFlow.mockResolvedValue(nonZeroData)
        const wrapper = shallowMount(TagChargesFlowChart, {
            props: { tagId: 1, currency: usd },
            global: { stubs: { USelect: true, UIcon: true, UAlert: true } },
        })
        await nextTick()
        await nextTick()
        expect(wrapper.exists()).toBe(true)
    })

    it('renders the Bar chart component after loading with non-zero data', async () => {
        mockGetTagChargesFlow.mockResolvedValue(nonZeroData)
        const wrapper = shallowMount(TagChargesFlowChart, {
            props: { tagId: 1, currency: usd },
            global: { stubs: { USelect: true, UIcon: true, UAlert: true } },
        })
        await new Promise(r => setTimeout(r, 0))
        await nextTick()
        expect(wrapper.findComponent({ name: 'Bar' }).exists()).toBe(true)
        expect(wrapper.find('p').exists()).toBe(false)
    })

    it('does NOT render Bar chart and shows empty state when all data is zero', async () => {
        mockGetTagChargesFlow.mockResolvedValue(zeroData)
        const wrapper = shallowMount(TagChargesFlowChart, {
            props: { tagId: 1, currency: usd },
            global: { stubs: { USelect: true, UIcon: true, UAlert: true } },
        })
        await new Promise(r => setTimeout(r, 0))
        await nextTick()
        expect(wrapper.findComponent({ name: 'Bar' }).exists()).toBe(false)
        expect(wrapper.text()).toContain('wallets.chartNoData')
    })

    it('does NOT render Bar chart and shows empty state when data is empty', async () => {
        mockGetTagChargesFlow.mockResolvedValue([])
        const wrapper = shallowMount(TagChargesFlowChart, {
            props: { tagId: 1, currency: usd },
            global: { stubs: { USelect: true, UIcon: true, UAlert: true } },
        })
        await new Promise(r => setTimeout(r, 0))
        await nextTick()
        expect(wrapper.findComponent({ name: 'Bar' }).exists()).toBe(false)
        expect(wrapper.text()).toContain('wallets.chartNoData')
    })

    it('y-scale tick callback returns integer (Math.round) when currency is null', async () => {
        mockGetTagChargesFlow.mockResolvedValue(nonZeroData)
        const wrapper = shallowMount(TagChargesFlowChart, {
            props: { tagId: 1, currency: null },
            global: { stubs: { USelect: true, UIcon: true, UAlert: true } },
        })
        await new Promise(r => setTimeout(r, 0))
        await nextTick()

        const vm = wrapper.vm as unknown as { chartOptions: { scales: { y: { ticks: { callback: (v: unknown) => unknown, precision: number } } } } }
        const ticks = vm.chartOptions.scales.y.ticks
        expect(ticks.precision).toBe(0)
        expect(ticks.callback(0.5)).toBe(1)
        expect(ticks.callback(1.7)).toBe(2)
        expect(ticks.callback(3.0)).toBe(3)
    })

    it('y-scale tick callback returns non-number unchanged', async () => {
        mockGetTagChargesFlow.mockResolvedValue(nonZeroData)
        const wrapper = shallowMount(TagChargesFlowChart, {
            props: { tagId: 1, currency: null },
            global: { stubs: { USelect: true, UIcon: true, UAlert: true } },
        })
        await new Promise(r => setTimeout(r, 0))
        await nextTick()

        const vm = wrapper.vm as unknown as { chartOptions: { scales: { y: { ticks: { callback: (v: unknown) => unknown } } } } }
        const cb = vm.chartOptions.scales.y.ticks.callback
        expect(cb('tick-label')).toBe('tick-label')
    })

    it('y-scale precision is 0', async () => {
        mockGetTagChargesFlow.mockResolvedValue(nonZeroData)
        const wrapper = shallowMount(TagChargesFlowChart, {
            props: { tagId: 1, currency: usd },
            global: { stubs: { USelect: true, UIcon: true, UAlert: true } },
        })
        await new Promise(r => setTimeout(r, 0))
        await nextTick()

        const vm = wrapper.vm as unknown as { chartOptions: { scales: { y: { ticks: { precision: number } } } } }
        expect(vm.chartOptions.scales.y.ticks.precision).toBe(0)
    })

    it('y-scale tick callback with currency produces no decimal fraction', async () => {
        mockGetTagChargesFlow.mockResolvedValue(nonZeroData)
        const wrapper = shallowMount(TagChargesFlowChart, {
            props: { tagId: 1, currency: usd },
            global: { stubs: { USelect: true, UIcon: true, UAlert: true } },
        })
        await new Promise(r => setTimeout(r, 0))
        await nextTick()

        const vm = wrapper.vm as unknown as { chartOptions: { scales: { y: { ticks: { callback: (v: unknown) => unknown } } } } }
        const result = vm.chartOptions.scales.y.ticks.callback(1234.56)
        // showFraction=false → Math.round(1234.56) → '1235', no decimal suffix
        expect(result).toBe('1235')
        expect(String(result)).not.toMatch(/[.,]\d{2}$/)
    })

    it('shows a retryable LoadErrorAlert on load failure, and reloads on retry', async () => {
        mockGetTagChargesFlow.mockRejectedValue(new Error('network error'))

        const wrapper = shallowMount(TagChargesFlowChart, {
            props: { tagId: 1, currency: usd },
        })
        await new Promise(r => setTimeout(r, 0))
        await nextTick()

        const alert = wrapper.findComponent({ name: 'LoadErrorAlert' })
        expect(alert.exists()).toBe(true)
        expect(alert.props('retryable')).toBe(true)

        mockGetTagChargesFlow.mockResolvedValue(nonZeroData)

        await alert.vm.$emit('retry')
        await new Promise(r => setTimeout(r, 0))
        await nextTick()

        expect(wrapper.findComponent({ name: 'LoadErrorAlert' }).exists()).toBe(false)
        expect(wrapper.findComponent({ name: 'Bar' }).exists()).toBe(true)
    })
})
