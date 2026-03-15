import { describe, it, expect, beforeAll } from 'vitest'
import { Currency } from '@/api/models/currency'
import { useMoneyFormatter } from '../useMoneyFormatter'

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

beforeAll(() => {
    Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true })
})

describe('useMoneyFormatter', () => {
    it('format(1234.5, usdCurrency) returns $1,234.50', () => {
        const { format } = useMoneyFormatter()
        expect(format(1234.5, usdCurrency)).toBe('$1,234.50')
    })

    it('format(1000, usdCurrency) returns $1,000.00', () => {
        const { format } = useMoneyFormatter()
        expect(format(1000, usdCurrency)).toBe('$1,000.00')
    })

    it('format(0.5, usdCurrency) returns $0.50', () => {
        const { format } = useMoneyFormatter()
        expect(format(0.5, usdCurrency)).toBe('$0.50')
    })

    it('format works with EUR currency', () => {
        const { format } = useMoneyFormatter()
        const result = format(100, eurCurrency)
        expect(result).toContain('100')
        expect(result).toContain('€')
    })
})
