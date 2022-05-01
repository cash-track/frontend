import { AxiosResponse } from 'axios';
import { client } from '@/api/client';
import { MessageResponseInterface } from '@/api/responses';

export interface EmailConfirmationInterface {
    email: string;
    createdAt: string;
    resendTimeLimit: number;
    validTimeLimit: number;
    timeSentAgo: number;
    isThrottled: boolean;
    isValid: boolean;
}

export interface EmailConfirmationResponseInterface {
    data: EmailConfirmationInterface;
}

export function profileGetEmailConfirmation(): Promise<AxiosResponse<EmailConfirmationResponseInterface>> {
    return client().get<EmailConfirmationResponseInterface>(`/api/auth/email/confirmation`)
}

export function profileResendEmailConfirmation(): Promise<AxiosResponse<MessageResponseInterface>> {
    return client().post<MessageResponseInterface>(`/api/auth/email/confirmation/resend`)
}
