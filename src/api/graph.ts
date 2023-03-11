import { AxiosResponse } from 'axios';
import { client } from '@/api/client';
import { FilterInterface } from '@/api/filters';

export const GROUP_BY_DAY = 'day'
export const GROUP_BY_MONTH = 'month'
export const GROUP_BY_YEAR = 'year'

export interface GraphDataEntry {
    date: string;
    timestamp: number;
    income: number;
    expense: number;
}

export interface GraphResponseInterface {
    data: Array<GraphDataEntry>;
}

export function tagGraphGet(tagId: number, filter?: FilterInterface): Promise<AxiosResponse<GraphResponseInterface>> {
    return client().get<GraphResponseInterface>(`/api/tags/${tagId}/charges/graph`, {
        params: filter?.getQuery()
    })
}

export function walletGraphGet(walletId: number, filter?: FilterInterface): Promise<AxiosResponse<GraphResponseInterface>> {
    return client().get<GraphResponseInterface>(`/api/wallets/${walletId}/charges/graph`, {
        params: filter?.getQuery()
    })
}

export function walletTagGraphGet(walletId: number, tagId: number, filter?: FilterInterface): Promise<AxiosResponse<GraphResponseInterface>> {
    return client().get<GraphResponseInterface>(`/api/wallets/${walletId}/tags/${tagId}/charges/graph`, {
        params: filter?.getQuery()
    })
}
