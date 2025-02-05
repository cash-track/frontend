import { AxiosResponse } from 'axios';
import { ApiCall, Repository } from '@/api/client';
import { CurrencyInterface } from '@/api/currency';
import { FilterInterface } from '@/api/filters';

export interface TotalRepositoryInterface {
    getTagTotal(tagId: number, filter?: FilterInterface): Promise<AxiosResponse<TotalResponseInterface>>
    getWalletTotal(walletId: number, filter?: FilterInterface): Promise<AxiosResponse<TotalResponseInterface>>
}

export class TotalRepository extends Repository implements TotalRepositoryInterface {

    @ApiCall()
    public getTagTotal(tagId: number, filter?: FilterInterface): Promise<AxiosResponse<TotalResponseInterface>> {
        return this.client.get<TotalResponseInterface>(`/api/tags/${tagId}/charges/total`, {
            params: filter?.getQuery()
        })
    }

    @ApiCall()
    public getWalletTotal(walletId: number, filter?: FilterInterface): Promise<AxiosResponse<TotalResponseInterface>> {
        return this.client.get<TotalResponseInterface>(`/api/wallets/${walletId}/total`, {
            params: filter?.getQuery()
        })
    }
}

export interface TotalInterface {
    totalAmount: number;
    totalIncomeAmount: number;
    totalExpenseAmount: number;
    currency: CurrencyInterface|undefined;
    tags: Array<TagTotalInterface>|undefined;
}

export interface TagTotalInterface {
    tagId: number;
    totalIncomeAmount: number;
    totalExpenseAmount: number;
}

export interface TotalResponseInterface {
    data: TotalInterface;
}
