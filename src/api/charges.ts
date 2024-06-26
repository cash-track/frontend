import { AxiosResponse } from 'axios';
import { client } from '@/api/client';
import { PaginatedResponseInterface } from '@/api/pagination';
import { TagInterface } from '@/api/tags';
import { WalletInterface } from '@/api/wallets';
import { UserInterface } from '@/api/users';
import { FilterInterface } from '@/api/filters';

export const TypeIncome = '+';
export const TypeExpense = '-';

export interface ChargeInterface {
    id: string;
    operation: string;
    amount: number;
    title: string;
    description: string;
    userId: number;
    walletId: number;
    dateTime: string;
    createdAt: string;
    updatedAt: string;

    user: UserInterface;
    wallet: WalletInterface|null;
    tags: Array<TagInterface>;
}

export interface ChargeTitleInterface {
    title: string;
    count: number;
}

export interface ChargesResponseInterface extends PaginatedResponseInterface{
    data: Array<ChargeInterface>;
}

export interface ChargeResponseInterface {
    data: ChargeInterface;
}

export interface ChargeTitlesResponseInterface {
    data: Array<ChargeTitleInterface>;
}

export interface ChargeCreateRequestInterface {
    type: string;
    amount: number|null;
    title: string;
    description: string;
    tags: Array<TagInterface>;
    dateTime: string|null;
}

export interface ChargeUpdateRequestInterface {
    type: string;
    amount: number|null;
    title: string;
    description: string;
    tags: Array<TagInterface>;
    dateTime: string|null;
}

export function walletChargesGet(walletId: number, filter?: FilterInterface): Promise<AxiosResponse<ChargesResponseInterface>> {
    return client().get<ChargesResponseInterface>(`/api/wallets/${walletId}/charges`, {
        params: filter?.getQuery()
    })
}

export function walletChargesGetPaginated(walletId: number, page: number, filter?: FilterInterface): Promise<AxiosResponse<ChargesResponseInterface>> {
    return client().get<ChargesResponseInterface>(`/api/wallets/${walletId}/charges`, {
        params: filter?.getQuery({
            'page': page
        })
    })
}

export function tagChargesGet(tagId: number, filter?: FilterInterface): Promise<AxiosResponse<ChargesResponseInterface>> {
    return client().get<ChargesResponseInterface>(`/api/tags/${tagId}/charges`, {
        params: filter?.getQuery()
    })
}

export function tagChargesGetPaginated(tagId: number, page: number, filter?: FilterInterface): Promise<AxiosResponse<ChargesResponseInterface>> {
    return client().get<ChargesResponseInterface>(`/api/tags/${tagId}/charges`, {
        params: filter?.getQuery({
            'page': page
        })
    })
}

export function walletChargeCreate(walletId: number, request: ChargeCreateRequestInterface): Promise<AxiosResponse<ChargeResponseInterface>> {
    return client().post<ChargeResponseInterface>(`/api/wallets/${walletId}/charges`, {
        type: request.type,
        amount: request.amount,
        title: request.title,
        description: request.description,
        tags: request.tags.length ? request.tags.map(tag => tag.id) : null,
        dateTime: request.dateTime,
    })
}

export function walletChargeUpdate(
    walletId: number,
    chargeId: string,
    request: ChargeUpdateRequestInterface
): Promise<AxiosResponse<ChargeResponseInterface>> {
    return client().put<ChargeResponseInterface>(`/api/wallets/${walletId}/charges/${chargeId}`, {
        type: request.type,
        amount: request.amount,
        title: request.title,
        description: request.description,
        tags: request.tags.length ? request.tags.map(tag => tag.id) : null,
        dateTime: request.dateTime,
    })
}

export function walletChargeDelete(
    walletId: number,
    chargeId: string,
): Promise<AxiosResponse> {
    return client().delete(`/api/wallets/${walletId}/charges/${chargeId}`)
}

export function walletChargesMove(
    walletId: number,
    targetWalletId: number,
    chargeIds: Array<string>,
): Promise<AxiosResponse> {
    return client().post(`/api/wallets/${walletId}/charges/move/${targetWalletId}`, {
        chargeIds: chargeIds,
    })
}

export function chargeTitleGetSuggestions(query: string): Promise<AxiosResponse<ChargeTitlesResponseInterface>> {
    return client().get<ChargeTitlesResponseInterface>(`/api/charges/title/suggestions/${query}`)
}
