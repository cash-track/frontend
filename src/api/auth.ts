import { apiCall } from './client'

export interface AuthRedirectResponse {
    redirectUrl: string
}

export interface LoginRequest {
    email: string
    password: string
}

export interface RegisterRequest {
    name: string
    lastName?: string | null
    nickName: string
    email: string
    password: string
    passwordConfirmation: string
    locale: string
}

export interface PasskeyLoginRequest {
    challenge: string
    data: string
}

export async function login(request: LoginRequest): Promise<AuthRedirectResponse> {
    return apiCall(async client => {
        const res = await client.post('/api/auth/login', request)
        return res.data as AuthRedirectResponse
    })
}

export async function register(request: RegisterRequest): Promise<AuthRedirectResponse> {
    return apiCall(async client => {
        const res = await client.post('/api/auth/register', request)
        return res.data as AuthRedirectResponse
    })
}

export async function logout(): Promise<AuthRedirectResponse> {
    return apiCall(async client => {
        const res = await client.post('/api/auth/logout')
        return res.data as AuthRedirectResponse
    })
}

export async function refreshToken(): Promise<void> {
    return apiCall(async client => {
        await client.post('/api/auth/refresh')
    })
}

export async function loginPasskeyInit(): Promise<unknown> {
    return apiCall(async client => {
        const res = await client.get('/api/auth/login/passkey/init')
        return res.data
    })
}

export async function loginPasskey(request: PasskeyLoginRequest): Promise<AuthRedirectResponse> {
    return apiCall(async client => {
        const res = await client.post('/api/auth/login/passkey', request)
        return res.data as AuthRedirectResponse
    })
}

export async function loginGoogle(token: string): Promise<AuthRedirectResponse> {
    return apiCall(async client => {
        const res = await client.post('/api/auth/provider/google', { token })
        return res.data as AuthRedirectResponse
    })
}
