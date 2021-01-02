import {client} from "@/api/client";
import {AxiosResponse} from "axios";

export interface ProfileResponseInterface {
    data: ProfileInterface;
}

export interface ProfileInterface {
    id: number;
    name: string;
    lastName: string;
    nickName: string;
    isEmailConfirmed: boolean;
    photoUrl: string | null;
}

export function emptyProfile(): ProfileInterface {
    return {
        id: 0,
        name: '',
        lastName: '',
        nickName: '',
        isEmailConfirmed: false,
        photoUrl: '',
    };
}

export function profileGet(): Promise<AxiosResponse<ProfileResponseInterface>> {
    return client().get<ProfileResponseInterface>('/api/profile')
}
