import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { Currency } from '@/api/models/currency'
import { useMoneyFormatter } from '../useMoneyFormatter'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ locale: ref('en') }),
}))

const usdCurrency = new Currency({
    id: 'USD',
    code: 'USD',
    name: 'US Dollar',
    char: '$',
    rate: 1.0,
    updatedAt: new Date(),
})

const eurCurrency = new Currency({
    id: 'EUR',
    code: 'EUR',
    name: 'Euro',
    char: '€',
    rate: 0.9,
    updatedAt: new Date(),
})

// \u00A0 is used as thousands separator and between number and currency char
describe('useMoneyFormatter', () => {
    it('format(1234.5, usdCurrency) places char after amount with spacing', () => {
        const { format } = useMoneyFormatter()
        expect(format(1234.5, usdCurrency)).toBe('1\u00A0234.50\u00A0$')
    })

    it('format(1000, usdCurrency) uses space as thousands separator', () => {
        const { format } = useMoneyFormatter()
        expect(format(1000, usdCurrency)).toBe('1\u00A0000.00\u00A0$')
    })

    it('format(0.5, usdCurrency) returns sub-thousand with fraction', () => {
        const { format } = useMoneyFormatter()
        expect(format(0.5, usdCurrency)).toBe('0.50\u00A0$')
    })

    it('format works with EUR currency char', () => {
        const { format } = useMoneyFormatter()
        const result = format(100, eurCurrency)
        expect(result).toContain('100')
        expect(result).toContain('€')
    })

    it('format(1234.56, usdCurrency, false) hides fractional part', () => {
        const { format } = useMoneyFormatter()
        expect(format(1234.56, usdCurrency, false)).toBe('1\u00A0235\u00A0$')
    })

    it('format(1000, usdCurrency, false) shows no decimals', () => {
        const { format } = useMoneyFormatter()
        expect(format(1000, usdCurrency, false)).toBe('1\u00A0000\u00A0$')
    })

    it('format(0.5, usdCurrency, false) rounds and hides fraction', () => {
        const { format } = useMoneyFormatter()
        expect(format(0.5, usdCurrency, false)).toBe('1\u00A0$')
    })
})
