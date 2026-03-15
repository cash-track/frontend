import { apiCall } from './client'

export interface ChargesFlowDataPoint {
    label: string
    amount: number
}

export interface GetChargesFlowParams {
    groupBy?: 'date' | 'day' | 'month'
    type?: '+' | '-'
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
                label: typeof d.label === 'string' ? d.label : '',
                amount: typeof d.amount === 'number' ? d.amount : 0,
            }
        })
    })
}
