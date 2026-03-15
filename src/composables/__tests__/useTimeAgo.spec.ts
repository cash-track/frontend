import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useTimeAgo } from '../useTimeAgo'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ locale: ref('en') }),
}))

describe('useTimeAgo', () => {
    it('date 1 hour ago returns locale-appropriate string', () => {
        const { timeAgo } = useTimeAgo()
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        expect(timeAgo(oneHourAgo)).toBe('1 hour ago')
    })

    it('date 2 hours ago', () => {
        const { timeAgo } = useTimeAgo()
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
        expect(timeAgo(twoHoursAgo)).toBe('2 hours ago')
    })

    it('date 30 minutes ago', () => {
        const { timeAgo } = useTimeAgo()
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000)
        expect(timeAgo(thirtyMinsAgo)).toBe('30 minutes ago')
    })

    it('date 3 days ago', () => {
        const { timeAgo } = useTimeAgo()
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        expect(timeAgo(threeDaysAgo)).toBe('3 days ago')
    })

    it('date in the future 1 hour', () => {
        const { timeAgo } = useTimeAgo()
        const oneHourLater = new Date(Date.now() + 60 * 60 * 1000)
        expect(timeAgo(oneHourLater)).toBe('in 1 hour')
    })
})
