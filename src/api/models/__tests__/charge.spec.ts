import { describe, it, expect } from 'vitest'
import { Charge, ChargeTotal, ChargeTitleSuggestion } from '../charge'

const chargeRaw = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    operation: '-',
    amount: 42.5,
    title: 'Groceries',
    description: 'Weekly shopping',
    userId: 1,
    walletId: 10,
    dateTime: '2024-05-15T14:30:00Z',
    createdAt: '2024-05-15T14:30:00Z',
    updatedAt: '2024-05-15T14:30:00Z',
    user: null,
    tags: [],
    wallet: null,
}

describe('Charge.from', () => {
    it('parses all required fields', () => {
        const c = Charge.from(chargeRaw)
        expect(c.id).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479')
        expect(c.operation).toBe('-')
        expect(c.amount).toBe(42.5)
        expect(c.title).toBe('Groceries')
        expect(c.description).toBe('Weekly shopping')
    })

    it('converts dateTime ISO string to Date', () => {
        const c = Charge.from(chargeRaw)
        expect(c.dateTime).toBeInstanceOf(Date)
        expect(c.dateTime.getFullYear()).toBe(2024)
        expect(c.dateTime.getMonth()).toBe(4) // May = 4
    })

    it('converts createdAt and updatedAt to Date', () => {
        const c = Charge.from(chargeRaw)
        expect(c.createdAt).toBeInstanceOf(Date)
        expect(c.updatedAt).toBeInstanceOf(Date)
    })

    it('parses + operation', () => {
        const c = Charge.from({ ...chargeRaw, operation: '+' })
        expect(c.operation).toBe('+')
    })

    it('parses nested tags', () => {
        const tagRaw = {
            id: 5, name: 'food', icon: '🍔', color: '#FF5733',
            userId: 1,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
        }
        const c = Charge.from({ ...chargeRaw, tags: [tagRaw] })
        expect(c.tags).toHaveLength(1)
        expect(c.tags[0].name).toBe('food')
    })

    it('throws on invalid operation', () => {
        expect(() => Charge.from({ ...chargeRaw, operation: '*' })).toThrow('invalid operation')
    })

    it('throws on missing id', () => {
        expect(() => Charge.from({ ...chargeRaw, id: undefined })).toThrow('"id"')
    })

    it('throws on non-object', () => {
        expect(() => Charge.from(null)).toThrow('expected object')
    })
})

describe('ChargeTotal.from', () => {
    it('parses totals with currency', () => {
        const t = ChargeTotal.from({
            totalAmount: 100,
            totalIncomeAmount: 200,
            totalExpenseAmount: 100,
            currency: { id: 'USD', code: 'USD', name: 'US Dollar', char: '$', rate: 1, updatedAt: '2024-01-01T00:00:00Z' },
        })
        expect(t.totalAmount).toBe(100)
        expect(t.currency?.code).toBe('USD')
    })

    it('defaults missing fields to 0', () => {
        const t = ChargeTotal.from({})
        expect(t.totalAmount).toBe(0)
        expect(t.currency).toBeNull()
    })
})

describe('ChargeTitleSuggestion.from', () => {
    it('parses title and count', () => {
        const s = ChargeTitleSuggestion.from({ title: 'Lunch', count: 12 })
        expect(s.title).toBe('Lunch')
        expect(s.count).toBe(12)
    })
})
