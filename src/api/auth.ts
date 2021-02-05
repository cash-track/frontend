import { AxiosResponse } from 'axios';
import { client } from '@/api/client';

export interface LogoutResponseInterface {
    redirectUrl: string;
}

export function logout(): Promise<AxiosResponse<LogoutResponseInterface>> {
    return client().post<LogoutResponseInterface>('/api/auth/logout')
}
