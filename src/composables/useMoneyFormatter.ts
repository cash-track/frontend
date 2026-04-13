import { useI18n } from 'vue-i18n'
import type { Currency } from '@/api/models/currency'

export function useMoneyFormatter() {
    const { locale } = useI18n()

    function format(amount: number, currency: Currency, showFraction = true): string {
        const digits = showFraction ? 2 : 0
        const parts = new Intl.NumberFormat(locale.value, {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
        }).formatToParts(amount)
        const n = parts.map(p => p.type === 'group' ? '\u00A0' : p.value).join('')
        return `${n}\u00A0${currency.char}`
    }

    return { format }
}
