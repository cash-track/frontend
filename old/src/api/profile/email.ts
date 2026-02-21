import { AxiosResponse } from 'axios';
import { ApiCall, Repository } from '@/api/client';
import { MessageResponseInterface } from '@/api/responses';

export interface EmailConfirmationRepositoryInterface {
    get(): Promise<AxiosResponse<EmailConfirmationResponseInterface>>
    resend(): Promise<AxiosResponse<MessageResponseInterface>>
}

export class EmailConfirmationRepository extends Repository implements EmailConfirmationRepositoryInterface {

    @ApiCall()
    public get(): Promise<AxiosResponse<EmailConfirmationResponseInterface>> {
        return this.client.get<EmailConfirmationResponseInterface>(`/api/auth/email/confirmation`)
    }

    @ApiCall()
    public resend(): Promise<AxiosResponse<MessageResponseInterface>> {
        return this.client.post<MessageResponseInterface>(`/api/auth/email/confirmation/resend`)
    }
}

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
