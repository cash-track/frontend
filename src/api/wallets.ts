import { AxiosResponse } from 'axios';
import { client } from '@/api/client';
import { CurrencyInterface, emptyCurrency } from '@/api/currency';
import { ProfilesResponseInterface } from '@/api/profile';

export interface WalletsResponseInterface {
    data: Array<WalletInterface>;
}

export interface WalletResponseInterface {
    data: WalletInterface;
}

export interface WalletTotalResponseInterface {
    data: WalletTotalInterface;
}

export interface WalletCreateRequestInterface {
    name: string;
    slug: string;
    isPublic: boolean;
    defaultCurrencyCode: string;
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

export interface WalletTotalInterface {
    totalAmount: number;
    totalIncomeAmount: number;
    totalExpenseAmount: number;
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

export function walletGet(walletId: number): Promise<AxiosResponse<WalletResponseInterface>> {
    return client().get<WalletResponseInterface>(`/api/wallets/${walletId}`)
}

export function walletTotalGet(walletId: number): Promise<AxiosResponse<WalletTotalResponseInterface>> {
    return client().get<WalletTotalResponseInterface>(`/api/wallets/${walletId}/total`)
}

export function walletCreate(request: WalletCreateRequestInterface): Promise<AxiosResponse<WalletResponseInterface>> {
    return client().post<WalletResponseInterface>('/api/wallets', {
        name: request.name,
        slug: request.slug,
        isPublic: request.isPublic,
        defaultCurrencyCode: request.defaultCurrencyCode,
    })
}

export function walletUsersGet(walletId: number): Promise<AxiosResponse<ProfilesResponseInterface>> {
    return client().get<ProfilesResponseInterface>(`/api/wallets/${walletId}/users`)
}

export function walletDelete(walletId: number): Promise<AxiosResponse> {
    return client().delete(`/api/wallets/${walletId}`)
}

export function walletActivate(walletId: number): Promise<AxiosResponse> {
    return client().post(`/api/wallets/${walletId}/activate`)
}

export function walletDisable(walletId: number): Promise<AxiosResponse> {
    return client().post(`/api/wallets/${walletId}/disable`)
}

export function walletArchive(walletId: number): Promise<AxiosResponse> {
    return client().post(`/api/wallets/${walletId}/archive`)
}

export function walletUnArchive(walletId: number): Promise<AxiosResponse> {
    return client().post(`/api/wallets/${walletId}/un-archive`)
}
