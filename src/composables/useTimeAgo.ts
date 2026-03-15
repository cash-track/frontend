import { useI18n } from 'vue-i18n'

export function useTimeAgo() {
    const { locale } = useI18n()

    function timeAgo(date: Date): string {
        const diffMs = date.getTime() - Date.now()
        const diffSecs = Math.round(diffMs / 1000)
        const diffMins = Math.round(diffSecs / 60)
        const diffHours = Math.round(diffMins / 60)
        const diffDays = Math.round(diffHours / 24)
        const diffWeeks = Math.round(diffDays / 7)
        const diffMonths = Math.round(diffDays / 30)
        const diffYears = Math.round(diffDays / 365)

        const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })

        if (Math.abs(diffSecs) < 60) return rtf.format(diffSecs, 'second')
        if (Math.abs(diffMins) < 60) return rtf.format(diffMins, 'minute')
        if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour')
        if (Math.abs(diffDays) < 7) return rtf.format(diffDays, 'day')
        if (Math.abs(diffWeeks) < 5) return rtf.format(diffWeeks, 'week')
        if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, 'month')
        return rtf.format(diffYears, 'year')
    }

    return { timeAgo }
}
