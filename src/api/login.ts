import {EntityIDResponseInterface} from "@/api/responses";
import {client} from "@/api/client";

export interface LoginRequestInterface {
    login: string;
    password: string;
    remember: boolean;
}

export interface LoginResponseInterface {
    data: EntityIDResponseInterface;
    accessToken: string;
    accessTokenExpiredAt: string;
    refreshToken: string;
    refreshTokenExpiredAt: string;
}

export function login(data: LoginRequestInterface) {
    return client().post('/auth/login', {
        email: data.login,
        password: data.password,
    })
}
