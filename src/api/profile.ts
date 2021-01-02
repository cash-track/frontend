import {client} from "@/api/client";
import {AxiosResponse} from "axios";
import {MessageResponseInterface} from "@/api/responses";

export interface ProfileResponseInterface {
    data: ProfileInterface;
}

export interface ProfileInterface {
    id: number;
    name: string;
    lastName: string;
    nickName: string;
    email: string;
    isEmailConfirmed: boolean;
    photoUrl: string | null;
    defaultCurrencyCode: string;
}

export function emptyProfile(): ProfileInterface {
    return {
        id: 0,
        name: '',
        lastName: '',
        nickName: '',
        email: '',
        isEmailConfirmed: false,
        photoUrl: '',
        defaultCurrencyCode: '',
    };
}

export function profileGet(): Promise<AxiosResponse<ProfileResponseInterface>> {
    return client().get<ProfileResponseInterface>('/api/profile')
}

export interface UpdateProfileRequestInterface {
    name: string;
    lastName: string;
    nickName: string;
    defaultCurrencyCode: string;
}

export function profilePut(request: UpdateProfileRequestInterface): Promise<AxiosResponse<ProfileResponseInterface>> {
    return client().put<ProfileResponseInterface>('/api/profile', {
        name: request.name,
        lastName: request.lastName,
        nickName: request.nickName,
        defaultCurrencyCode: request.defaultCurrencyCode,
    })
}

export interface CheckNickNameRequestInterface {
    nickName: string;
}

export function profileCheckNickName(request: CheckNickNameRequestInterface): Promise<AxiosResponse<MessageResponseInterface>> {
    return client().post<MessageResponseInterface>('/api/profile/check/nick-name', {
        nickName: request.nickName,
    })
}
