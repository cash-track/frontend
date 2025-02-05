import { AxiosResponse } from 'axios';
import { ApiCall, Repository } from '@/api/client';

export interface AuthRepositoryInterface {
    logout(): Promise<AxiosResponse<LogoutResponseInterface>>
}

export class AuthRepository extends Repository implements AuthRepositoryInterface {

    @ApiCall()
    public logout(): Promise<AxiosResponse<LogoutResponseInterface>> {
        return this.client.post<LogoutResponseInterface>('/api/auth/logout')
    }
}

export interface LogoutResponseInterface {
    redirectUrl: string;
}
