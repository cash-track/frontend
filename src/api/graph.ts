import { apiCall } from './client'

export interface ChargesFlowDataPoint {
    date: string
    timestamp: number
    income: number
    expense: number
}

export interface ChargesTotalDataPoint {
    amount: number
    tags: number[]
}

export interface GetChargesFlowParams {
    'group-by'?: 'day' | 'month' | 'year'
    'date-from'?: string
    'date-to'?: string
    tags?: string
}

export async function getChargesFlowByDate(
    walletId: number,
    params?: GetChargesFlowParams,
): Promise<ChargesFlowDataPoint[]> {
    return apiCall(async client => {
        const res = await client.get(`/api/wallets/${walletId}/charges/graph/amount`, { params })
        return (res.data.data as unknown[]).map(item => {
            const d = item as Record<string, unknown>
            return {
                date: typeof d.date === 'string' ? d.date : '',
                timestamp: typeof d.timestamp === 'number' ? d.timestamp : 0,
                income: typeof d.income === 'number' ? d.income : 0,
                expense: typeof d.expense === 'number' ? d.expense : 0,
            }
        })
    })
}

export interface GetChargesTotalParams {
    'charge-type'?: 'income' | 'expense'
    'date-from'?: string
    'date-to'?: string
    tags?: string
}

export async function getChargesTotalByType(
    walletId: number,
    params?: GetChargesTotalParams,
): Promise<ChargesTotalDataPoint[]> {
    return apiCall(async client => {
        const res = await client.get(`/api/wallets/${walletId}/charges/graph/total`, {
            params,
        })
        return (res.data.data as unknown[]).map(item => {
            const d = item as Record<string, unknown>
            return {
                amount: typeof d.amount === 'number' ? d.amount : 0,
                tags: Array.isArray(d.tags) ? (d.tags as number[]) : [],
            }
        })
    })
}
