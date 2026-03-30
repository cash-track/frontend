import { apiCall } from '../client'

export interface UpdatePasswordRequest {
    currentPassword: string
    newPassword: string
    newPasswordConfirmation: string
}

export interface ForgotPasswordRequest {
    email: string
}

export interface ResetPasswordRequest {
    code: string
    password: string
    passwordConfirmation: string
}

export async function updatePassword(request: UpdatePasswordRequest): Promise<void> {
    return apiCall(async client => {
        await client.put('/api/profile/password', request)
    })
}

export async function forgotPassword(request: ForgotPasswordRequest): Promise<string> {
    return apiCall(async client => {
        const res = await client.post('/api/auth/password/forgot', request)
        return (res.data as Record<string, unknown>).message as string
    })
}

export async function resetPassword(request: ResetPasswordRequest): Promise<string> {
    return apiCall(async client => {
        const res = await client.post('/api/auth/password/reset', request)
        return (res.data as Record<string, unknown>).message as string
    })
}
