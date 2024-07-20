import { AxiosResponse } from 'axios';
import { client } from '@/api/client';
import { WalletInterface } from '@/api/wallets';
import { TagInterface } from '@/api/tags';

export interface LimitInterface {
    id: number;
    operation: string;
    amount: number;
    walletId: number;
    createdAt: string;
    updatedAt: string;

    wallet: WalletInterface|null;
    tags: Array<TagInterface>;
}

export interface WalletLimitInterface {
    amount: number;
    percentage: number;
    limit: LimitInterface;
}

export interface WalletLimitsResponseInterface {
    data: Array<WalletLimitInterface>;
}

export interface LimitResponseInterface {
    data: LimitInterface;
}

export interface LimitRequestInterface {
    type: string;
    amount: number|null;
    tags: Array<TagInterface>;
}

export function walletLimitsGet(walletId: number): Promise<AxiosResponse<WalletLimitsResponseInterface>> {
    return client().get<WalletLimitsResponseInterface>(`/api/wallets/${walletId}/limits`)
}

export function walletLimitCreate(walletId: number, request: LimitRequestInterface): Promise<AxiosResponse<LimitResponseInterface>> {
    return client().post<LimitResponseInterface>(`/api/wallets/${walletId}/limits`, {
        type: request.type,
        amount: request.amount,
        tags: request.tags.map(tag => tag.id),
    })
}

export function walletLimitUpdate(walletId: number, limitId: number, request: LimitRequestInterface): Promise<AxiosResponse<LimitResponseInterface>> {
    return client().put<LimitResponseInterface>(`/api/wallets/${walletId}/limits/${limitId}`, {
        type: request.type,
        amount: request.amount,
        tags: request.tags.map(tag => tag.id),
    })
}

export function walletLimitDelete(
    walletId: number,
    limitId: number,
): Promise<AxiosResponse> {
    return client().delete(`/api/wallets/${walletId}/limits/${limitId}`)
}
