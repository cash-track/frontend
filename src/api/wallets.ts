import { AxiosResponse } from 'axios';
import { client } from '@/api/client';
import { CurrencyInterface, emptyCurrency } from '@/api/currency';
import { UserInterface, UsersResponseInterface } from '@/api/users';
import { ChargeInterface } from '@/api/charges';
import { TagsResponseInterface } from '@/api/tags';

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

export function walletsGet(): Promise<AxiosResponse<WalletsFullResponseInterface>> {
    return client().get<WalletsFullResponseInterface>('/api/wallets')
}

export function walletsUnArchivedGet(): Promise<AxiosResponse<WalletsFullResponseInterface>> {
    return client().get<WalletsFullResponseInterface>('/api/wallets/unarchived')
}

export function walletsUnArchivedSort(request: WalletSortSetRequestInterface): Promise<AxiosResponse> {
    return client().post('/api/wallets/unarchived/sort', {
        sort: request.sort,
    })
}

export function walletsArchivedGet(): Promise<AxiosResponse<WalletsFullResponseInterface>> {
    return client().get<WalletsFullResponseInterface>('/api/wallets/archived')
}

export function walletsHasLimitsGet(archived: boolean): Promise<AxiosResponse<WalletsResponseInterface>> {
    return client().get<WalletsResponseInterface>('/api/wallets/has-limits' + (archived ? '?archived' : ''))
}

export function walletGet(walletId: number): Promise<AxiosResponse<WalletResponseInterface>> {
    return client().get<WalletResponseInterface>(`/api/wallets/${walletId}`)
}

export function walletCreate(request: WalletCreateRequestInterface): Promise<AxiosResponse<WalletResponseInterface>> {
    return client().post<WalletResponseInterface>('/api/wallets', {
        name: request.name,
        slug: request.slug,
        isPublic: request.isPublic,
        defaultCurrencyCode: request.defaultCurrencyCode,
    })
}

export function walletUpdate(walletId: number, request: WalletUpdateRequestInterface): Promise<AxiosResponse<WalletResponseInterface>> {
    return client().put<WalletResponseInterface>(`/api/wallets/${walletId}`, {
        name: request.name,
        isPublic: request.isPublic,
        defaultCurrencyCode: request.defaultCurrencyCode,
    })
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

export function walletUsersGet(walletId: number): Promise<AxiosResponse<UsersResponseInterface>> {
    return client().get<UsersResponseInterface>(`/api/wallets/${walletId}/users`)
}

export function walletUsersAdd(walletId: number, user: UserInterface): Promise<AxiosResponse> {
    return client().patch(`/api/wallets/${walletId}/users/${user.id.toString()}`)
}

export function walletUsersDelete(walletId: number, user: UserInterface): Promise<AxiosResponse> {
    return client().delete(`/api/wallets/${walletId}/users/${user.id.toString()}`)
}

export function walletTagsGet(walletId: number): Promise<AxiosResponse<TagsResponseInterface>> {
    return client().get<TagsResponseInterface>(`/api/wallets/${walletId}/tags`)
}

export function walletTagSearch(walletId: number, query: string): Promise<AxiosResponse<TagsResponseInterface>> {
    return client().get<TagsResponseInterface>(`/api/wallets/${walletId}/tags/find/${query}`)
}
