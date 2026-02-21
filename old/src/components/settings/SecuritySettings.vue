<template>
    <b-form novalidate @submit="onSubmit">
        <b-card footer-tag="footer" header-tag="header">
            <template v-slot:header>
                <div class="text-md-center">
                    <b>{{ $t('securitySettings.changePassword') }}</b>
                </div>
            </template>

            <b-form-group
                label-align-lg="right"
                label-cols-lg="4"
                label-for="currentPassword"
                :invalid-feedback="validationMessage('currentPassword')"
                :state="validationState('currentPassword')"
            >
                <template v-slot:label>{{ $t('securitySettings.currentPassword') }}</template>
                <b-form-input
                    id="currentPassword"
                    v-model="form.currentPassword"
                    required
                    type="password"
                    :disabled="isLoading"
                    :state="validationState('currentPassword')"
                    @change="resetValidationMessage('currentPassword')"
                ></b-form-input>
            </b-form-group>

            <b-form-group
                label-align-lg="right"
                label-cols-lg="4"
                label-for="newPassword"
                :invalid-feedback="validationMessage('newPassword')"
                :state="validationState('newPassword')"
                :description="$t('securitySettings.newPasswordDescription')"
            >
                <template v-slot:label>{{ $t('securitySettings.newPassword') }}</template>
                <b-form-input
                    id="newPassword"
                    v-model="form.newPassword"
                    required
                    type="password"
                    :disabled="isLoading"
                    :state="validationState('newPassword')"
                    @change="resetValidationMessage('newPassword')"
                ></b-form-input>
            </b-form-group>

            <b-form-group
                label-align-lg="right"
                label-cols-lg="4"
                label-for="newPasswordConfirmation"
                :invalid-feedback="validationMessage('newPasswordConfirmation')"
                :state="validationState('newPasswordConfirmation')"
                :description="$t('securitySettings.newPasswordConfirmationDescription')"
            >
                <template v-slot:label>{{ $t('securitySettings.newPasswordConfirmation') }}</template>
                <b-form-input
                    id="newPasswordConfirmation"
                    v-model="form.newPasswordConfirmation"
                    required
                    type="password"
                    :disabled="isLoading"
                    :state="validationState('newPasswordConfirmation')"
                    @change="resetValidationMessage('newPasswordConfirmation')"
                ></b-form-input>
            </b-form-group>

            <b-alert
                variant="warning"
                fade
                dismissible
                :show="hasMessage"
                @dismissed="resetMessage()"
            >
                <b-icon-exclamation-triangle-fill></b-icon-exclamation-triangle-fill>
                {{ message }}
            </b-alert>

            <b-alert
                variant="success"
                fade
                dismissible
                :show="successMessage !== ''"
                @dismissed="successMessage = ''"
            >
                <b-icon-check2-circle></b-icon-check2-circle>
                {{ successMessage }}
            </b-alert>

            <template v-slot:footer>
                <div class="text-center">
                    <b-button variant="primary" type="submit" :disabled="isLoading">
                        {{ $t('securitySettings.updatePassword') }}
                        <b-spinner v-show="isLoading" small></b-spinner>
                    </b-button>
                </div>
            </template>
        </b-card>
    </b-form>
</template>

<script lang="ts">
import { Mixins, Component } from 'vue-property-decorator'
import { AxiosResponse } from 'axios';
import Loader from '@/shared/Loader';
import Messager from '@/shared/Messager';
import Validator from '@/shared/Validator';
import {
    ChangePasswordRequestInterface,
    PasswordRepositoryInterface,
    PasswordRepository
} from '@/api/profile/password'
import { MessageResponseInterface } from '@/api/responses';

@Component
export default class SecuritySettings extends Mixins(Loader, Messager, Validator) {
    repository: PasswordRepositoryInterface = new PasswordRepository()

    form: ChangePasswordRequestInterface = {
        currentPassword: '',
        newPassword: '',
        newPasswordConfirmation: '',
    }
    successMessage = ''

    protected onSubmit(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.resetValidationMessages()
        this.resetMessage()
        this.setLoading()
        this.successMessage = ''

        this.repository.change(this.form)
            .then(this.onSuccess)
            .catch(this.dispatchError)
            .finally(this.setLoaded)
    }

    protected onSuccess(response: AxiosResponse<MessageResponseInterface>) {
        this.successMessage = response.data.message
        this.form = {
            currentPassword: '',
            newPassword: '',
            newPasswordConfirmation: '',
        }
    }
}
</script>

<style scoped>

</style>