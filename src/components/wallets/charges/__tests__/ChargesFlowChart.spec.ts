import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import ChargesFlowChart from '../ChargesFlowChart.vue'
import { Currency } from '@/api/models/currency'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: ref('en'),
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

vi.mock('@/api/graph', () => ({
    getChargesFlowByDate: vi.fn().mockResolvedValue([
        { date: '2025-01-01', timestamp: 1735689600, income: 500, expense: 300 },
        { date: '2025-01-02', timestamp: 1735776000, income: 0, expense: 200 },
    ]),
}))

const usd = new Currency({ id: 'USD', code: 'USD', name: 'US Dollar', char: '$', rate: 1, updatedAt: new Date() })

describe('ChargesFlowChart', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('mounts without errors', async () => {
        const wrapper = shallowMount(ChargesFlowChart, {
            props: { walletId: 1, currency: usd },
            global: { stubs: { USelect: true, UIcon: true, UAlert: true } },
        })
        await nextTick()
        await nextTick()
        expect(wrapper.exists()).toBe(true)
    })

    it('renders the Bar chart component after loading', async () => {
        const wrapper = shallowMount(ChargesFlowChart, {
            props: { walletId: 1, currency: usd },
            global: { stubs: { USelect: true, UIcon: true, UAlert: true } },
        })
        await new Promise(r => setTimeout(r, 0))
        await nextTick()
        expect(wrapper.findComponent({ name: 'Bar' }).exists()).toBe(true)
    })
})
