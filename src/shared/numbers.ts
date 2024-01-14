import { CurrencyInterface } from '@/api/currency';

export function money(value: number, currency: CurrencyInterface|undefined): string {
    let str = Intl.NumberFormat().format(value)

    if (str.endsWith('.00')) {
        str = str.slice(0, str.length - 3)
    }

    if (currency === undefined) {
        return str
    }

    return `${str} ${currency.char}`
}

export function getRGBBrightness(rgb: Array<number>): number {
    return Math.round(((rgb[0] * 299) + (rgb[1] * 587) + (rgb[2] * 114)) / 1000);
}
