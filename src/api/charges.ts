import { AxiosResponse } from 'axios';
import { client } from '@/api/client';
import { ProfileInterface } from '@/api/profile';
import { PaginatedResponseInterface } from '@/api/pagination';

export const TypeIncome = '+';
export const TypeExpense = '-';

export interface ChargeInterface {
    id: string;
    operation: string;
    amount: number;
    title: string;
    description: string;
    userId: number;
    user: ProfileInterface;
    walletId: number;
    createdAt: string;
    updatedAt: string;
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
}

export interface ChargeUpdateRequestInterface {
    type: string;
    amount: number|null;
    title: string;
    description: string;
}

export function walletChargesGet(walletId: number): Promise<AxiosResponse<ChargesResponseInterface>> {
    return client().get<ChargesResponseInterface>(`/api/wallets/${walletId}/charges`)
}

export function walletChargesGetPaginated(walletId: number, page: number): Promise<AxiosResponse<ChargesResponseInterface>> {
    return client().get<ChargesResponseInterface>(`/api/wallets/${walletId}/charges?page=${page}`)
}

export function walletChargeCreate(walletId: number, request: ChargeCreateRequestInterface): Promise<AxiosResponse<ChargeResponseInterface>> {
    return client().post<ChargeResponseInterface>(`/api/wallets/${walletId}/charges`, {
        type: request.type,
        amount: request.amount,
        title: request.title,
        description: request.description,
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
    })
}

export function walletChargeDelete(
    walletId: number,
    chargeId: string,
): Promise<AxiosResponse> {
    return client().delete(`/api/wallets/${walletId}/charges/${chargeId}`)
}
