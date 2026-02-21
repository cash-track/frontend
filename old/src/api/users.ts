import { AxiosResponse } from 'axios';
import { ApiCall, Repository } from '@/api/client';

export interface UsersRepositoryInterface {
    findByEmail(email: string): Promise<AxiosResponse<UserResponseInterface>>
    findByCommonWallets(): Promise<AxiosResponse<UsersResponseInterface>>
}

export class UsersRepository extends Repository implements UsersRepositoryInterface {

    @ApiCall()
    public findByEmail(email: string): Promise<AxiosResponse<UserResponseInterface>> {
        return this.client.get<UserResponseInterface>(`/api/users/find/by-email/${email}`)
    }

    @ApiCall()
    public findByCommonWallets(): Promise<AxiosResponse<UsersResponseInterface>> {
        return this.client.get<UsersResponseInterface>('/api/users/find/by-common-wallets')
    }
}

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
