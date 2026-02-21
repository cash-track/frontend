import { AxiosResponse } from 'axios';
import { ApiCall, Repository } from '@/api/client';
import { PaginatedResponseInterface } from '@/api/pagination';
import { TagInterface } from '@/api/tags';
import { WalletInterface } from '@/api/wallets';
import { UserInterface } from '@/api/users';
import { FilterInterface } from '@/api/filters';

export interface ChargesRepositoryInterface {
    get(walletId: number, filter?: FilterInterface): Promise<AxiosResponse<ChargesResponseInterface>>
    getPaginated(walletId: number, page: number, filter?: FilterInterface): Promise<AxiosResponse<ChargesResponseInterface>>
    getByTag(tagId: number, filter?: FilterInterface): Promise<AxiosResponse<ChargesResponseInterface>>
    getByTagPaginated(tagId: number, page: number, filter?: FilterInterface): Promise<AxiosResponse<ChargesResponseInterface>>
    create(walletId: number, request: ChargeCreateRequestInterface): Promise<AxiosResponse<ChargeResponseInterface>>
    update(walletId: number, chargeId: string, request: ChargeUpdateRequestInterface): Promise<AxiosResponse<ChargeResponseInterface>>
    delete(walletId: number, chargeId: string): Promise<AxiosResponse>
    move(walletId: number, targetWalletId: number, chargeIds: Array<string>): Promise<AxiosResponse>
    getSuggestions(query: string): Promise<AxiosResponse<ChargeTitlesResponseInterface>>
}

export class ChargesRepository extends Repository implements ChargesRepositoryInterface {

    @ApiCall()
    public get(walletId: number, filter?: FilterInterface): Promise<AxiosResponse<ChargesResponseInterface>> {
        return this.client.get<ChargesResponseInterface>(`/api/wallets/${walletId}/charges`, {
            params: filter?.getQuery()
        })
    }

    @ApiCall()
    public getPaginated(walletId: number, page: number, filter?: FilterInterface): Promise<AxiosResponse<ChargesResponseInterface>> {
        return this.client.get<ChargesResponseInterface>(`/api/wallets/${walletId}/charges`, {
            params: filter?.getQuery({
                'page': page
            })
        })
    }

    @ApiCall()
    public getByTag(tagId: number, filter?: FilterInterface): Promise<AxiosResponse<ChargesResponseInterface>> {
        return this.client.get<ChargesResponseInterface>(`/api/tags/${tagId}/charges`, {
            params: filter?.getQuery()
        })
    }

    @ApiCall()
    public getByTagPaginated(tagId: number, page: number, filter?: FilterInterface): Promise<AxiosResponse<ChargesResponseInterface>> {
        return this.client.get<ChargesResponseInterface>(`/api/tags/${tagId}/charges`, {
            params: filter?.getQuery({
                'page': page
            })
        })
    }

    @ApiCall()
    public create(walletId: number, request: ChargeCreateRequestInterface): Promise<AxiosResponse<ChargeResponseInterface>> {
        return this.client.post<ChargeResponseInterface>(`/api/wallets/${walletId}/charges`, {
            type: request.type,
            amount: request.amount,
            title: request.title,
            description: request.description,
            tags: request.tags.length ? request.tags.map(tag => tag.id) : null,
            dateTime: request.dateTime,
        })
    }

    @ApiCall()
    public update(
        walletId: number,
        chargeId: string,
        request: ChargeUpdateRequestInterface
    ): Promise<AxiosResponse<ChargeResponseInterface>> {
        return this.client.put<ChargeResponseInterface>(`/api/wallets/${walletId}/charges/${chargeId}`, {
            type: request.type,
            amount: request.amount,
            title: request.title,
            description: request.description,
            tags: request.tags.length ? request.tags.map(tag => tag.id) : null,
            dateTime: request.dateTime,
        })
    }

    @ApiCall()
    public delete(
        walletId: number,
        chargeId: string,
    ): Promise<AxiosResponse> {
        return this.client.delete(`/api/wallets/${walletId}/charges/${chargeId}`)
    }

    @ApiCall()
    public move(
        walletId: number,
        targetWalletId: number,
        chargeIds: Array<string>,
    ): Promise<AxiosResponse> {
        return this.client.post(`/api/wallets/${walletId}/charges/move/${targetWalletId}`, {
            chargeIds: chargeIds,
        })
    }

    @ApiCall()
    public getSuggestions(query: string): Promise<AxiosResponse<ChargeTitlesResponseInterface>> {
        return this.client.get<ChargeTitlesResponseInterface>(`/api/charges/title/suggestions/${query}`)
    }
}

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
