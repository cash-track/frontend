import { apiCall } from './client'
import { Currency } from './models/currency'

export async function getCurrencies(): Promise<Currency[]> {
    return apiCall(async client => {
        const res = await client.get('/api/currencies')
        return (res.data.data as unknown[]).map(Currency.from)
    })
}

export async function getFeaturedCurrencies(): Promise<Currency[]> {
    return apiCall(async client => {
        const res = await client.get('/api/currencies/featured')
        return (res.data.data as unknown[]).map(Currency.from)
    })
}
