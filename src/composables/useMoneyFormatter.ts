import { useI18n } from 'vue-i18n'
import type { Currency } from '@/api/models/currency'

export function useMoneyFormatter() {
    const { locale } = useI18n()

    function format(amount: number, currency: Currency): string {
        try {
            return new Intl.NumberFormat(locale.value, {
                style: 'currency',
                currency: currency.code,
            }).format(amount)
        } catch {
            const n = new Intl.NumberFormat(locale.value, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(amount)
            return `${n} ${currency.char}`
        }
    }

    return { format }
}
