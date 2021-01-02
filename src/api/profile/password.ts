import {client} from "@/api/client";
import {AxiosResponse} from "axios";
import {MessageResponseInterface} from "@/api/responses";

export interface ChangePasswordRequestInterface {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirmation: string;
}

export function passwordChange(request: ChangePasswordRequestInterface): Promise<AxiosResponse<MessageResponseInterface>> {
    return client().put<MessageResponseInterface>('/api/profile/password', {
        currentPassword: request.currentPassword,
        newPassword: request.newPassword,
        newPasswordConfirmation: request.newPasswordConfirmation,
    })
}
