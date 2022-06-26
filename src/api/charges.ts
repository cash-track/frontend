import { AxiosResponse } from 'axios';
import { client } from '@/api/client';
import { PaginatedResponseInterface } from '@/api/pagination';
import { TagInterface } from '@/api/tags';
import { WalletInterface } from '@/api/wallets';
import { UserInterface } from '@/api/users';

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
    createdAt: string;
    updatedAt: string;

    user: UserInterface;
    wallet: WalletInterface|null;
    tags: Array<TagInterface>;
}

export interface ChargesResponseInterface extends PaginatedResponseInterface{
    data: Array<ChargeInterface>;
}

export interface ChargeResponseInterface {
    data: ChargeInterface;
}

export interface ChargeCreateRequestInterface {
    type: string;
    amount: number|null;
    title: string;
    description: string;
    tags: Array<TagInterface>;
}

export interface ChargeUpdateRequestInterface {
    type: string;
    amount: number|null;
    title: string;
    description: string;
    tags: Array<TagInterface>;
}

export function walletChargesGet(walletId: number): Promise<AxiosResponse<ChargesResponseInterface>> {
    return client().get<ChargesResponseInterface>(`/api/wallets/${walletId}/charges`)
}

export function walletChargesGetPaginated(walletId: number, page: number): Promise<AxiosResponse<ChargesResponseInterface>> {
    return client().get<ChargesResponseInterface>(`/api/wallets/${walletId}/charges?page=${page}`)
}

export function tagChargesGet(tagId: number): Promise<AxiosResponse<ChargesResponseInterface>> {
    return client().get<ChargesResponseInterface>(`/api/tags/${tagId}/charges`)
}

export function tagChargesGetPaginated(tagId: number, page: number): Promise<AxiosResponse<ChargesResponseInterface>> {
    return client().get<ChargesResponseInterface>(`/api/tags/${tagId}/charges?page=${page}`)
}

export function walletTagChargesGet(walletId: number, tagId: number): Promise<AxiosResponse<ChargesResponseInterface>> {
    return client().get<ChargesResponseInterface>(`/api/wallets/${walletId}/tags/${tagId}/charges`)
}

export function walletTagChargesGetPaginated(walletId: number, tagId: number, page: number): Promise<AxiosResponse<ChargesResponseInterface>> {
    return client().get<ChargesResponseInterface>(`/api/wallets/${walletId}/tags/${tagId}/charges?page=${page}`)
}

export function walletChargeCreate(walletId: number, request: ChargeCreateRequestInterface): Promise<AxiosResponse<ChargeResponseInterface>> {
    return client().post<ChargeResponseInterface>(`/api/wallets/${walletId}/charges`, {
        type: request.type,
        amount: request.amount,
        title: request.title,
        description: request.description,
        tags: request.tags.length ? request.tags.map(tag => tag.id) : null,
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
    })
}

export function walletChargeDelete(
    walletId: number,
    chargeId: string,
): Promise<AxiosResponse> {
    return client().delete(`/api/wallets/${walletId}/charges/${chargeId}`)
}
