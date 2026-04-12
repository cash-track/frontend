import { apiCall } from './client'

export interface ChargesFlowTagEntry {
    income: number
    expense: number
}

export interface ChargesFlowDataPoint {
    date: string
    timestamp: number
    income: number
    expense: number
    tags?: Record<number, ChargesFlowTagEntry>
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
            const tags: Record<number, ChargesFlowTagEntry> = {}
            if (d.tags && typeof d.tags === 'object' && !Array.isArray(d.tags)) {
                for (const [key, val] of Object.entries(d.tags as Record<string, unknown>)) {
                    const tagId = parseInt(key, 10)
                    if (!isNaN(tagId) && val && typeof val === 'object') {
                        const t = val as Record<string, unknown>
                        tags[tagId] = {
                            income: typeof t.income === 'number' ? t.income : 0,
                            expense: typeof t.expense === 'number' ? t.expense : 0,
                        }
                    }
                }
            }
            return {
                date: typeof d.date === 'string' ? d.date : '',
                timestamp: typeof d.timestamp === 'number' ? d.timestamp : 0,
                income: typeof d.income === 'number' ? d.income : 0,
                expense: typeof d.expense === 'number' ? d.expense : 0,
                ...(Object.keys(tags).length > 0 ? { tags } : {}),
            }
        })
    })
}

export async function getTagChargesFlow(
    tagId: number,
    params?: GetChargesFlowParams,
): Promise<ChargesFlowDataPoint[]> {
    return apiCall(async client => {
        const res = await client.get(`/api/tags/${tagId}/charges/graph`, { params })
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
