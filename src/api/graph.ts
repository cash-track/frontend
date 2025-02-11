import { AxiosResponse } from 'axios';
import { ApiCall, Repository } from '@/api/client';
import { FilterInterface } from '@/api/filters';

export const GROUP_BY_DAY = 'day'
export const GROUP_BY_MONTH = 'month'
export const GROUP_BY_YEAR = 'year'

export interface GraphRepositoryInterface {
    getTagGraph(tagId: number, filter?: FilterInterface): Promise<AxiosResponse<AmountGraphResponseInterface>>
    getWalletGraphAmount(walletId: number, filter?: FilterInterface): Promise<AxiosResponse<AmountGraphResponseInterface>>
    getWalletGraphTotal(walletId: number, filter?: FilterInterface): Promise<AxiosResponse<TotalGraphResponseInterface>>
}

export class GraphRepository extends Repository implements GraphRepositoryInterface {

    @ApiCall()
    public getTagGraph(tagId: number, filter?: FilterInterface): Promise<AxiosResponse<AmountGraphResponseInterface>> {
        return this.client.get<AmountGraphResponseInterface>(`/api/tags/${tagId}/charges/graph`, {
            params: filter?.getQuery()
        })
    }

    @ApiCall()
    public getWalletGraphAmount(walletId: number, filter?: FilterInterface): Promise<AxiosResponse<AmountGraphResponseInterface>> {
        return this.client.get<AmountGraphResponseInterface>(`/api/wallets/${walletId}/charges/graph/amount`, {
            params: filter?.getQuery()
        })
    }

    @ApiCall()
    public getWalletGraphTotal(walletId: number, filter?: FilterInterface): Promise<AxiosResponse<TotalGraphResponseInterface>> {
        return this.client.get<TotalGraphResponseInterface>(`/api/wallets/${walletId}/charges/graph/total`, {
            params: filter?.getQuery()
        })
    }
}

export interface AmountGraphDataEntry extends ValuesDataEntry {
    date: string;
    timestamp: number;
    tags: Record<number, ValuesDataEntry>|undefined;
}

export interface ValuesDataEntry {
    income: number|undefined;
    expense: number|undefined;
}

export interface AmountGraphResponseInterface {
    data: Array<AmountGraphDataEntry>;
}

export interface TotalGraphDataEntry {
    amount: number;
    tags: Array<number>;
}

export interface TotalGraphResponseInterface {
    data: Array<TotalGraphDataEntry>;
}
