import { AxiosResponse } from 'axios';
import { client } from '@/api/client';
import { CurrencyInterface } from '@/api/currency';
import { FilterInterface } from '@/api/filters';

export interface TotalInterface {
    totalAmount: number;
    totalIncomeAmount: number;
    totalExpenseAmount: number;
    currency: CurrencyInterface|null;
}

export interface TotalResponseInterface {
    data: TotalInterface;
}

export function tagTotalGet(tagId: number, filter?: FilterInterface): Promise<AxiosResponse<TotalResponseInterface>> {
    return client().get<TotalResponseInterface>(`/api/tags/${tagId}/charges/total`, {
        params: filter?.getQuery()
    })
}

export function walletTotalGet(walletId: number): Promise<AxiosResponse<TotalResponseInterface>> {
    return client().get<TotalResponseInterface>(`/api/wallets/${walletId}/total`)
}

export function walletTagTotalGet(walletId: number, tagId: number): Promise<AxiosResponse<TotalResponseInterface>> {
    return client().get<TotalResponseInterface>(`/api/wallets/${walletId}/tags/${tagId}/total`)
}
