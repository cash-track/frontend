import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { Currency } from '@/api/models/currency'
import MoneyAmount from '../MoneyAmount.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ locale: ref('en') }),
}))

const usd = new Currency({
    id: 'USD',
    code: 'USD',
    name: 'US Dollar',
    char: '$',
    rate: 1.0,
    updatedAt: new Date(),
})

describe('MoneyAmount', () => {
    it('hides fractional part by default', () => {
        const wrapper = mount(MoneyAmount, { props: { amount: 1234.56, currency: usd } })
        expect(wrapper.text()).toBe('1\u00A0235\u00A0$')
    })

    it('renders fractional part when showFraction is true', () => {
        const wrapper = mount(MoneyAmount, { props: { amount: 1234.56, currency: usd, showFraction: true } })
        expect(wrapper.text()).toBe('1\u00A0234.56\u00A0$')
    })

    it('renders integer amounts correctly without fraction', () => {
        const wrapper = mount(MoneyAmount, { props: { amount: 1000, currency: usd } })
        expect(wrapper.text()).toBe('1\u00A0000\u00A0$')
    })

    it('renders raw number as string when currency is null', () => {
        const wrapper = mount(MoneyAmount, { props: { amount: 42.5, currency: null } })
        expect(wrapper.text()).toBe('42.5')
    })

    it('renders raw number as string when currency is undefined', () => {
        const wrapper = mount(MoneyAmount, { props: { amount: 100 } })
        expect(wrapper.text()).toBe('100')
    })

    it('forwards class attribute to root span via fallthrough', () => {
        const wrapper = mount(MoneyAmount, {
            props: { amount: 100, currency: usd },
            attrs: { class: 'text-success font-bold' },
        })
        expect(wrapper.classes()).toContain('text-success')
        expect(wrapper.classes()).toContain('font-bold')
    })

    it('renders a span element', () => {
        const wrapper = mount(MoneyAmount, { props: { amount: 50, currency: usd } })
        expect(wrapper.element.tagName).toBe('SPAN')
    })
})
