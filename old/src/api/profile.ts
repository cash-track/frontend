import { AxiosResponse } from 'axios';
import { ApiCall, Repository } from '@/api/client';
import { MessageResponseInterface } from '@/api/responses';
import { UserInterface } from '@/api/users';

export interface ProfileRepositoryInterface {
    get(): Promise<AxiosResponse<ProfileResponseInterface>>
    put(request: UpdateProfileRequestInterface): Promise<AxiosResponse<ProfileResponseInterface>>
    checkNickName(request: CheckNickNameRequestInterface): Promise<AxiosResponse<MessageResponseInterface>>
    putPhoto(request: UpdateProfilePhotoRequestInterface): Promise<AxiosResponse<ProfilePhotoResponseInterface>>
    putLocale(request: UpdateProfileLocaleRequestInterface): Promise<AxiosResponse<ProfileResponseInterface>>
    getSocial(): Promise<AxiosResponse<ProfileSocialResponseInterface>>
}

export class ProfileRepository extends Repository implements ProfileRepositoryInterface {

    @ApiCall()
    public get(): Promise<AxiosResponse<ProfileResponseInterface>> {
        return this.client.get<ProfileResponseInterface>('/api/profile')
    }

    @ApiCall()
    public put(request: UpdateProfileRequestInterface): Promise<AxiosResponse<ProfileResponseInterface>> {
        return this.client.put<ProfileResponseInterface>('/api/profile', {
            name: request.name,
            lastName: request.lastName,
            nickName: request.nickName,
            defaultCurrencyCode: request.defaultCurrencyCode,
            locale: request.locale,
        })
    }

    @ApiCall()
    public checkNickName(request: CheckNickNameRequestInterface): Promise<AxiosResponse<MessageResponseInterface>> {
        return this.client.post<MessageResponseInterface>('/api/profile/check/nick-name', {
            nickName: request.nickName,
        })
    }

    @ApiCall()
    public putPhoto(request: UpdateProfilePhotoRequestInterface): Promise<AxiosResponse<ProfilePhotoResponseInterface>> {
        const form = new FormData();

        // @ts-expect-error unknown file type
        form.set('photo', request.photo);

        return this.client.put<ProfilePhotoResponseInterface>('/api/profile/photo', form, {
            headers: {
                "Content-Type": "multipart/form-data",
            }
        })
    }

    @ApiCall()
    public putLocale(request: UpdateProfileLocaleRequestInterface): Promise<AxiosResponse<ProfileResponseInterface>> {
        return this.client.put<ProfileResponseInterface>('/api/profile/locale', {
            locale: request.locale,
        })
    }

    @ApiCall()
    public getSocial(): Promise<AxiosResponse<ProfileSocialResponseInterface>> {
        return this.client.get<ProfileSocialResponseInterface>('/api/profile/social')
    }
}

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
    locale: string;
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
        locale: '',
    };
}

export interface UpdateProfileRequestInterface {
    name: string;
    lastName: string;
    nickName: string;
    defaultCurrencyCode: string;
    locale: string;
}

export interface CheckNickNameRequestInterface {
    nickName: string;
}

export interface UpdateProfilePhotoRequestInterface {
    photo: File | null;
}

export interface UpdateProfileLocaleRequestInterface {
    locale: string;
}

export interface ProfileSocialResponseInterface {
    data: {
        google: boolean;
    };
}
