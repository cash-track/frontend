import {client} from "@/api/client";
import {EntityIDResponseInterface} from "@/api/responses";

export interface RegisterRequestInterface extends CheckNickNameRequestInterface{
    name: string;
    lastName: string;
    nickName: string;
    email: string;
    password: string;
    passwordConfirmation: string;
}

export interface CheckNickNameRequestInterface {
    nickName: string;
}

export interface RegisterResponseInterface {
    data: EntityIDResponseInterface;
    accessToken: string;
    accessTokenExpiredAt: string;
    refreshToken: string;
    refreshTokenExpiredAt: string;
}

export function checkNickName(data: CheckNickNameRequestInterface) {
    return client().post('/auth/register/check/nick-name', {
        nickName: data.nickName,
    }).then(response => {
        if (response.status !== 200) {
            // this should go to catch handler
            throw new Error('Nick name has been already taken')
        }
    })
}

export function register(data: RegisterRequestInterface) {
    return client().post<RegisterResponseInterface>('/auth/register', {
        name: data.name,
        lastName: data.lastName,
        nickName: data.nickName,
        email: data.email,
        password: data.password,
        passwordConfirmation: data.passwordConfirmation,
    })
}
