import { AxiosResponse } from 'axios';
import { ApiCall, Repository } from '@/api/client';
import { WalletInterface } from '@/api/wallets';
import { TagInterface } from '@/api/tags';

export interface LimitsRepositoryInterface {
    get(walletId: number): Promise<AxiosResponse<WalletLimitsResponseInterface>>
    create(walletId: number, request: LimitRequestInterface): Promise<AxiosResponse<LimitResponseInterface>>
    update(walletId: number, limitId: number, request: LimitRequestInterface): Promise<AxiosResponse<LimitResponseInterface>>
    delete(walletId: number, limitId: number): Promise<AxiosResponse>
    copy(walletId: number, sourceWalletId: number): Promise<AxiosResponse<WalletLimitsResponseInterface>>
}

export class LimitsRepository extends Repository implements LimitsRepositoryInterface {

    @ApiCall()
    public get(walletId: number): Promise<AxiosResponse<WalletLimitsResponseInterface>> {
        return this.client.get<WalletLimitsResponseInterface>(`/api/wallets/${walletId}/limits`)
    }

    @ApiCall()
    public create(walletId: number, request: LimitRequestInterface): Promise<AxiosResponse<LimitResponseInterface>> {
        return this.client.post<LimitResponseInterface>(`/api/wallets/${walletId}/limits`, {
            type: request.type,
            amount: request.amount,
            tags: request.tags.map(tag => tag.id),
        })
    }

    @ApiCall()
    public update(walletId: number, limitId: number, request: LimitRequestInterface): Promise<AxiosResponse<LimitResponseInterface>> {
        return this.client.put<LimitResponseInterface>(`/api/wallets/${walletId}/limits/${limitId}`, {
            type: request.type,
            amount: request.amount,
            tags: request.tags.map(tag => tag.id),
        })
    }

    @ApiCall()
    public delete(walletId: number, limitId: number): Promise<AxiosResponse> {
        return this.client.delete(`/api/wallets/${walletId}/limits/${limitId}`)
    }

    @ApiCall()
    public copy(walletId: number, sourceWalletId: number): Promise<AxiosResponse<WalletLimitsResponseInterface>> {
        return this.client.post<WalletLimitsResponseInterface>(`/api/wallets/${walletId}/limits/copy/${sourceWalletId}`)
    }
}

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
