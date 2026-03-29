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
    getChargesTotalByType: vi.fn().mockResolvedValue([
        { amount: 500, tags: [1] },
        { amount: 3000, tags: [2] },
    ]),
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

    it('renders Doughnut chart after loading', async () => {
        const wrapper = shallowMount(ChargesTotalChart, {
            props: { walletId: 1, currency: usd },
            global: { stubs: { UIcon: true, UAlert: true } },
        })
        await new Promise(r => setTimeout(r, 0))
        await nextTick()
        expect(wrapper.findComponent({ name: 'Doughnut' }).exists()).toBe(true)
    })
})
