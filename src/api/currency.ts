import { AxiosResponse } from 'axios';
import { ApiCall, Repository } from '@/api/client';

export interface CurrenciesRepositoryInterface {
    get(): Promise<AxiosResponse<CurrenciesResponseInterface>>
    getFeatured(): Promise<AxiosResponse<CurrenciesResponseInterface>>
}

export class CurrenciesRepository extends Repository implements CurrenciesRepositoryInterface {

    @ApiCall()
    public get(): Promise<AxiosResponse<CurrenciesResponseInterface>> {
        return this.client.get<CurrenciesResponseInterface>('/api/currencies')
    }

    @ApiCall()
    public getFeatured(): Promise<AxiosResponse<CurrenciesResponseInterface>> {
        return this.client.get<CurrenciesResponseInterface>('/api/currencies/featured')
    }
}

export interface CurrenciesResponseInterface {
    data: Array<CurrencyInterface>;
}

export interface CurrencyInterface {
    id: string;
    code: string;
    name: string;
    char: string;
    rate: number;
    updatedAt: string;
}

export function emptyCurrency(): CurrencyInterface {
    return {
        id: '',
        code: '',
        name: '',
        char: '',
        rate: 0,
        updatedAt: '',
    }
}
