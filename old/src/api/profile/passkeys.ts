import { AxiosResponse } from 'axios';
import { ApiCall, Repository } from '@/api/client';
import { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/types';

export interface PasskeysRepositoryInterface {
    get(): Promise<AxiosResponse<PasskeysResponseInterface>>
    init(request: InitPasskeyRequestInterface): Promise<AxiosResponse<InitPasskeyResponseInterface>>
    store(request: StorePasskeyRequestInterface): Promise<AxiosResponse<StorePasskeyResponseInterface>>
    delete(passkeyId: number): Promise<AxiosResponse>
}

export class PasskeysRepository extends Repository implements PasskeysRepositoryInterface {

    @ApiCall()
    public get(): Promise<AxiosResponse<PasskeysResponseInterface>> {
        return this.client.get<PasskeysResponseInterface>('/api/profile/passkey')
    }

    @ApiCall()
    public init(request: InitPasskeyRequestInterface): Promise<AxiosResponse<InitPasskeyResponseInterface>> {
        return this.client.post<InitPasskeyResponseInterface>('/api/profile/passkey/init', {
            name: request.name,
        }).then(res=> {
            res.data.dataDecoded = decode<PublicKeyCredentialCreationOptionsJSON>(res.data.data)
            return res
        })
    }

    @ApiCall()
    public store(request: StorePasskeyRequestInterface): Promise<AxiosResponse<StorePasskeyResponseInterface>> {
        return this.client.post<StorePasskeyResponseInterface>('/api/profile/passkey', {
            challenge: request.challenge,
            data: encode(request.data),
        })
    }

    @ApiCall()
    public delete(passkeyId: number): Promise<AxiosResponse> {
        return this.client.delete<AxiosResponse>(`/api/profile/passkey/${passkeyId}`)
    }
}

export interface PasskeyInterface {
    id: number;
    name: string;
    createdAt: string;
    usedAt: null|string;
}

export interface PasskeysResponseInterface {
    data: Array<PasskeyInterface>;
}

export interface InitPasskeyRequestInterface {
    name: string;
}

export interface InitPasskeyResponseInterface {
    challenge: string
    data: string;
    dataDecoded: PublicKeyCredentialCreationOptionsJSON;
}

export interface StorePasskeyRequestInterface {
    challenge: string;
    data: object;
}

export interface StorePasskeyResponseInterface {
    data: PasskeyInterface;
}

function decode<T>(data: string): T {
    return JSON.parse(atob(data))
}

function encode(data: object): string {
    return btoa(JSON.stringify(data))
}
