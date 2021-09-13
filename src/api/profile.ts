import { AxiosResponse } from 'axios';
import { client } from '@/api/client';
import { MessageResponseInterface } from '@/api/responses';
import { UserInterface } from '@/api/users';

export interface ProfileResponseInterface {
    data: ProfileInterface;
}

export interface ProfilesResponseInterface {
    data: Array<ProfileInterface>;
}

export interface ProfileInterface extends UserInterface {
    email: string;
    isEmailConfirmed: boolean;
    defaultCurrencyCode: string;
}

export interface ProfilePhotoResponseInterface {
    message: string;
    fileName: string;
    url: string;
}

export function emptyProfile(): ProfileInterface {
    return {
        id: 0,
        name: '',
        lastName: '',
        nickName: '',
        email: '',
        isEmailConfirmed: true,
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

export interface UpdateProfilePhotoRequestInterface {
    photo: File | null;
}

export function profilePutPhoto(request: UpdateProfilePhotoRequestInterface): Promise<AxiosResponse<ProfilePhotoResponseInterface>> {
    const form = new FormData();

    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    form.set('photo', request.photo);

    return client().put<ProfilePhotoResponseInterface>('/api/profile/photo', form, {
        headers: {
            "Content-Type": "multipart/form-data",
        }
    })
}
