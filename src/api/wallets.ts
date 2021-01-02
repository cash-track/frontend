import {CurrencyInterface, emptyCurrency} from "@/api/currency";
import { AxiosResponse } from "axios";
import { client } from "@/api/client";

export interface WalletsResponseInterface {
    data: Array<WalletInterface>;
}

export interface WalletResponseInterface {
    data: WalletInterface;
}

export interface WalletInterface {
    id: number;
    name: string;
    slug: string;
    totalAmount: number;
    isActive: boolean;
    isPublic: boolean;
    isArchived: boolean;
    createdAt: string;
    updatedAt: string;
    defaultCurrencyCode: string;
    defaultCurrency: CurrencyInterface;
}

export function emptyWallet(): WalletInterface {
    return {
        id: 0,
        name: '',
        slug: '',
        totalAmount: 0,
        isActive: false,
        isPublic: false,
        isArchived: false,
        createdAt: '',
        updatedAt: '',
        defaultCurrencyCode: '',
        defaultCurrency: emptyCurrency(),
    }
}

export function walletsGet(): Promise<AxiosResponse<WalletsResponseInterface>> {
    return client().get<WalletsResponseInterface>('/api/wallets')
}

export function walletGet(ID: number): Promise<AxiosResponse<WalletResponseInterface>> {
    return client().get<WalletResponseInterface>(`/api/wallets/${ID}`)
}

