import { AxiosResponse } from 'axios';
import { ApiCall, Repository } from '@/api/client';
import { CurrencyInterface, emptyCurrency } from '@/api/currency';
import { UserInterface, UsersResponseInterface } from '@/api/users';
import { ChargeInterface } from '@/api/charges';
import { TagsResponseInterface } from '@/api/tags';

export interface WalletsRepositoryInterface {
    getAll(): Promise<AxiosResponse<WalletsFullResponseInterface>>
    getUnArchived(): Promise<AxiosResponse<WalletsFullResponseInterface>>
    sortUnArchived(request: WalletSortSetRequestInterface): Promise<AxiosResponse>
    getArchived(): Promise<AxiosResponse<WalletsFullResponseInterface>>
    getHasLimits(archived: boolean): Promise<AxiosResponse<WalletsResponseInterface>>
    get(walletId: number): Promise<AxiosResponse<WalletResponseInterface>>
    create(request: WalletCreateRequestInterface): Promise<AxiosResponse<WalletResponseInterface>>
    update(walletId: number, request: WalletUpdateRequestInterface): Promise<AxiosResponse<WalletResponseInterface>>
    delete(walletId: number): Promise<AxiosResponse>
    activate(walletId: number): Promise<AxiosResponse>
    disable(walletId: number): Promise<AxiosResponse>
    archive(walletId: number): Promise<AxiosResponse>
    unArchive(walletId: number): Promise<AxiosResponse>
    getUsers(walletId: number): Promise<AxiosResponse<UsersResponseInterface>>
    addUser(walletId: number, user: UserInterface): Promise<AxiosResponse>
    deleteUser(walletId: number, user: UserInterface): Promise<AxiosResponse>
    getTags(walletId: number): Promise<AxiosResponse<TagsResponseInterface>>
    searchTags(walletId: number, query: string): Promise<AxiosResponse<TagsResponseInterface>>
}

export class WalletsRepository extends Repository implements WalletsRepositoryInterface {

    @ApiCall()
    public getAll(): Promise<AxiosResponse<WalletsFullResponseInterface>> {
        return this.client.get<WalletsFullResponseInterface>('/api/wallets')
    }

    @ApiCall()
    public getUnArchived(): Promise<AxiosResponse<WalletsFullResponseInterface>> {
        return this.client.get<WalletsFullResponseInterface>('/api/wallets/unarchived')
    }

    @ApiCall()
    public sortUnArchived(request: WalletSortSetRequestInterface): Promise<AxiosResponse> {
        return this.client.post('/api/wallets/unarchived/sort', {
            sort: request.sort,
        })
    }

    @ApiCall()
    public getArchived(): Promise<AxiosResponse<WalletsFullResponseInterface>> {
        return this.client.get<WalletsFullResponseInterface>('/api/wallets/archived')
    }

    @ApiCall()
    public getHasLimits(archived: boolean): Promise<AxiosResponse<WalletsResponseInterface>> {
        return this.client.get<WalletsResponseInterface>('/api/wallets/has-limits' + (archived ? '?archived' : ''))
    }

    @ApiCall()
    public get(walletId: number): Promise<AxiosResponse<WalletResponseInterface>> {
        return this.client.get<WalletResponseInterface>(`/api/wallets/${walletId}`)
    }

    @ApiCall()
    public create(request: WalletCreateRequestInterface): Promise<AxiosResponse<WalletResponseInterface>> {
        return this.client.post<WalletResponseInterface>('/api/wallets', {
            name: request.name,
            slug: request.slug,
            isPublic: request.isPublic,
            defaultCurrencyCode: request.defaultCurrencyCode,
        })
    }

    @ApiCall()
    public update(walletId: number, request: WalletUpdateRequestInterface): Promise<AxiosResponse<WalletResponseInterface>> {
        return this.client.put<WalletResponseInterface>(`/api/wallets/${walletId}`, {
            name: request.name,
            isPublic: request.isPublic,
            defaultCurrencyCode: request.defaultCurrencyCode,
        })
    }

    @ApiCall()
    public delete(walletId: number): Promise<AxiosResponse> {
        return this.client.delete(`/api/wallets/${walletId}`)
    }

    @ApiCall()
    public activate(walletId: number): Promise<AxiosResponse> {
        return this.client.post(`/api/wallets/${walletId}/activate`)
    }

    @ApiCall()
    public disable(walletId: number): Promise<AxiosResponse> {
        return this.client.post(`/api/wallets/${walletId}/disable`)
    }

    @ApiCall()
    public archive(walletId: number): Promise<AxiosResponse> {
        return this.client.post(`/api/wallets/${walletId}/archive`)
    }

    @ApiCall()
    public unArchive(walletId: number): Promise<AxiosResponse> {
        return this.client.post(`/api/wallets/${walletId}/un-archive`)
    }

    @ApiCall()
    public getUsers(walletId: number): Promise<AxiosResponse<UsersResponseInterface>> {
        return this.client.get<UsersResponseInterface>(`/api/wallets/${walletId}/users`)
    }

    @ApiCall()
    public addUser(walletId: number, user: UserInterface): Promise<AxiosResponse> {
        return this.client.patch(`/api/wallets/${walletId}/users/${user.id.toString()}`)
    }

    @ApiCall()
    public deleteUser(walletId: number, user: UserInterface): Promise<AxiosResponse> {
        return this.client.delete(`/api/wallets/${walletId}/users/${user.id.toString()}`)
    }

    @ApiCall()
    public getTags(walletId: number): Promise<AxiosResponse<TagsResponseInterface>> {
        return this.client.get<TagsResponseInterface>(`/api/wallets/${walletId}/tags`)
    }

    @ApiCall()
    public searchTags(walletId: number, query: string): Promise<AxiosResponse<TagsResponseInterface>> {
        return this.client.get<TagsResponseInterface>(`/api/wallets/${walletId}/tags/find/${query}`)
    }
}

export interface WalletsResponseInterface {
    data: Array<WalletInterface>;
}

export interface WalletsFullResponseInterface {
    data: Array<WalletFullInterface>;
}

export interface WalletResponseInterface {
    data: WalletInterface;
}

export interface WalletSortSetRequestInterface {
    sort: Array<number>;
}

export interface WalletCreateRequestInterface {
    name: string;
    slug: string;
    isPublic: boolean;
    defaultCurrencyCode: string;
}

export interface WalletUpdateRequestInterface {
    name: string;
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

export interface WalletFullInterface extends WalletInterface {
    users: Array<UserInterface>;
    latestCharges: Array<ChargeInterface>;
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

export function emptyWalletFull(): WalletFullInterface {
    return Object.assign(emptyWallet(), {
        users: [],
        latestCharges: [],
    })
}
