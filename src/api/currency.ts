import {client} from "@/api/client";
import {AxiosResponse} from "axios";

export interface CurrenciesResponseInterface {
    data: Array<CurrencyInterface>;
}

export interface CurrencyInterface {
    ID: string;
    code: string;
    name: string;
    char: string;
    rate: number;
    updatedAt: string;
}

export function currenciesGet(): Promise<AxiosResponse<CurrenciesResponseInterface>> {
    return client().get<CurrenciesResponseInterface>('/api/currencies')
}

export function featuredCurrenciesGet(): Promise<AxiosResponse<CurrenciesResponseInterface>> {
    return client().get<CurrenciesResponseInterface>('/api/currencies/featured')
}
