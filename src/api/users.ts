import { AxiosResponse } from 'axios';
import { client } from '@/api/client';

export interface UserResponseInterface {
    data: UserInterface;
}

export interface UsersResponseInterface {
    data: Array<UserInterface>;
}

export interface UserInterface {
    id: number;
    name: string;
    lastName: string;
    nickName: string;
    photoUrl: string | null;
}

export function emptyUser(): UserInterface {
    return {
        id: 0,
        name: '',
        lastName: '',
        nickName: '',
        photoUrl: '',
    };
}

export function userFindByEmail(email: string): Promise<AxiosResponse<UserResponseInterface>> {
    return client().get<UserResponseInterface>(`/api/users/find/by-email/${email}`)
}
