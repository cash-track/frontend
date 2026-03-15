import type { Currency } from '@/api/models/currency'

export function useMoneyFormatter() {
    function format(amount: number, currency: Currency): string {
        try {
            return new Intl.NumberFormat(navigator.language, {
                style: 'currency',
                currency: currency.code,
            }).format(amount)
        } catch {
            const n = new Intl.NumberFormat(navigator.language, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(amount)
            return `${n} ${currency.char}`
        }
    }

    return { format }
}
