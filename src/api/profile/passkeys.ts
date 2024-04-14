import { AxiosResponse } from 'axios';
import { client } from '@/api/client';
import { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/types';

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

export function passkeysGet(): Promise<AxiosResponse<PasskeysResponseInterface>> {
    return client().get<PasskeysResponseInterface>('/api/profile/passkey')
}

export function passkeyInit(request: InitPasskeyRequestInterface): Promise<AxiosResponse<InitPasskeyResponseInterface>> {
    return client().post<InitPasskeyResponseInterface>('/api/profile/passkey/init', {
        name: request.name,
    }).then(res=> {
        res.data.dataDecoded = decode<PublicKeyCredentialCreationOptionsJSON>(res.data.data)
        return res
    })
}

export function passkeyStore(request: StorePasskeyRequestInterface): Promise<AxiosResponse<StorePasskeyResponseInterface>> {
    return client().post<StorePasskeyResponseInterface>('/api/profile/passkey', {
        challenge: request.challenge,
        data: encode(request.data),
    })
}

export function passkeyDelete(passkeyId: number): Promise<AxiosResponse> {
    return client().delete<AxiosResponse>(`/api/profile/passkey/${passkeyId}`)
}

function decode<T>(data: string): T {
    return JSON.parse(atob(data))
}

function encode(data: object): string {
    return btoa(JSON.stringify(data))
}
