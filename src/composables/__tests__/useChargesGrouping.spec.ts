import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { Charge } from '@/api/models/charge'
import { useChargesGrouping } from '../useChargesGrouping'

function makeCharge(dateTime: Date, id = 'c1'): Charge {
    return new Charge({
        id,
        operation: '-',
        amount: 10,
        title: 'Test',
        description: null,
        userId: 1,
        walletId: 1,
        dateTime,
        createdAt: dateTime,
        updatedAt: dateTime,
        user: null,
        tags: [],
        wallet: null,
    })
}

describe('useChargesGrouping', () => {
    it('returns empty map for empty charges', () => {
        const charges = ref<Charge[]>([])
        const { chargesGrouped } = useChargesGrouping(charges, k => k, ref('en'))
        expect(chargesGrouped.value.size).toBe(0)
    })

    it('groups today\'s charge under charges.today key', () => {
        const now = new Date()
        const charge = makeCharge(now)
        const charges = ref([charge])
        const { chargesGrouped } = useChargesGrouping(charges, k => k, ref('en'))

        expect(chargesGrouped.value.has('charges.today')).toBe(true)
        expect(chargesGrouped.value.get('charges.today')).toHaveLength(1)
    })

    it('groups yesterday\'s charge under a localized date string', () => {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const charge = makeCharge(yesterday)
        const charges = ref([charge])
        const { chargesGrouped } = useChargesGrouping(charges, k => k, ref('en'))

        expect(chargesGrouped.value.has('charges.today')).toBe(false)
        expect(chargesGrouped.value.size).toBe(1)

        const expectedKey = new Date(yesterday)
        expectedKey.setHours(0, 0, 0, 0)
        const expected = expectedKey.toLocaleDateString('en', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
        expect(chargesGrouped.value.has(expected)).toBe(true)
    })

    it('groups two charges on the same day into one group', () => {
        const today = new Date()
        const c1 = makeCharge(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0), 'c1')
        const c2 = makeCharge(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0), 'c2')
        const charges = ref([c1, c2])
        const { chargesGrouped } = useChargesGrouping(charges, k => k, ref('en'))

        expect(chargesGrouped.value.size).toBe(1)
        expect(chargesGrouped.value.get('charges.today')).toHaveLength(2)
    })

    it('groups charges on different days into separate groups', () => {
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)

        const c1 = makeCharge(today, 'c1')
        const c2 = makeCharge(yesterday, 'c2')
        const charges = ref([c1, c2])
        const { chargesGrouped } = useChargesGrouping(charges, k => k, ref('en'))

        expect(chargesGrouped.value.size).toBe(2)
    })

    it('produces different group keys for different locales', () => {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const charge = makeCharge(yesterday)
        const charges = ref([charge])

        const { chargesGrouped: groupedEn } = useChargesGrouping(charges, k => k, ref('en'))
        const { chargesGrouped: groupedUk } = useChargesGrouping(charges, k => k, ref('uk'))

        const keyEn = [...groupedEn.value.keys()][0]
        const keyUk = [...groupedUk.value.keys()][0]
        // Different locales produce different formatted date strings
        expect(keyEn).not.toBe(keyUk)
    })

    it('is reactive: updates when charges ref changes', () => {
        const charges = ref<Charge[]>([])
        const { chargesGrouped } = useChargesGrouping(charges, k => k, ref('en'))

        expect(chargesGrouped.value.size).toBe(0)

        charges.value = [makeCharge(new Date())]
        expect(chargesGrouped.value.size).toBe(1)
    })
})
