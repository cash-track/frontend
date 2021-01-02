import {client} from "@/api/client";
import {AxiosResponse} from "axios";

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

export function currenciesGet(): Promise<AxiosResponse<CurrenciesResponseInterface>> {
    return client().get<CurrenciesResponseInterface>('/api/currencies')
}

export function featuredCurrenciesGet(): Promise<AxiosResponse<CurrenciesResponseInterface>> {
    return client().get<CurrenciesResponseInterface>('/api/currencies/featured')
}
