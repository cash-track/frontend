import { AxiosResponse } from 'axios';
import { ApiCall, Repository } from '@/api/client';
import { MessageResponseInterface } from '@/api/responses';

export interface PasswordRepositoryInterface {
    change(request: ChangePasswordRequestInterface): Promise<AxiosResponse<MessageResponseInterface>>
}

export class PasswordRepository extends Repository implements PasswordRepositoryInterface {

    @ApiCall()
    public change(request: ChangePasswordRequestInterface): Promise<AxiosResponse<MessageResponseInterface>> {
        return this.client.put<MessageResponseInterface>('/api/profile/password', {
            currentPassword: request.currentPassword,
            newPassword: request.newPassword,
            newPasswordConfirmation: request.newPasswordConfirmation,
        })
    }
}

export interface ChangePasswordRequestInterface {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirmation: string;
}
