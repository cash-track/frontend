<template>
    <b-form @submit="onSubmit" novalidate>
        <b-card header-tag="header" footer-tag="footer">
            <template v-slot:header>
                Register
            </template>

            <b-form-group 
                label-cols-md="4" 
                label-align-md="right" 
                label-for="name" 
                :invalid-feedback="nameValidationError" 
                :state="nameValidationState">
                <template v-slot:label>
                    Name <span class="text-danger">*</span>
                </template>
                
                <b-form-input 
                    id="name" 
                    class="col-md-8" 
                    v-model="form.name" 
                    required 
                    :state="nameValidationState" 
                    :disabled="isLoading"></b-form-input>
            </b-form-group>

            <b-form-group 
                label-cols-md="4"
                label-align-md="right"
                label-for="last-name" 
                :invalid-feedback="lastNameValidationError" 
                :state="lastNameValidationState">
                <template v-slot:label>
                    Last Name
                </template>
                <b-form-input 
                    id="last-name" 
                    class="col-md-8" 
                    v-model="form.lastName" 
                    :state="lastNameValidationState" 
                    :disabled="isLoading"></b-form-input>
            </b-form-group>

            <b-form-group 
                label-cols-md="4"
                label-align-md="right"
                label-for="nick-name" 
                :invalid-feedback="nickNameValidationError" 
                :state="nickNameValidationState">
                <template v-slot:label>
                    Nick Name <span class="text-danger">*</span>
                </template>
                <b-form-input 
                    id="nick-name" 
                    class="col-md-8" 
                    v-model="form.nickName" 
                    required 
                    debounce="1000"
                    :state="nickNameValidationState || isNickNameValid" 
                    :disabled="isLoading"></b-form-input>
            </b-form-group>

            <b-form-group 
                label-cols-md="4"
                label-align-md="right"
                label-for="email" 
                :invalid-feedback="emailValidationError" 
                :state="emailValidationState">
                <template v-slot:label>
                    Email <span class="text-danger">*</span>
                </template>
                <b-form-input 
                    id="email" 
                    class="col-md-8" 
                    type="email" 
                    v-model="form.email" 
                    required 
                    :state="emailValidationState" 
                    :disabled="isLoading"></b-form-input>
            </b-form-group>

            <b-form-group 
                label-cols-md="4"
                label-align-md="right"
                label-for="password" 
                :invalid-feedback="passwordValidationError" 
                :state="passwordValidationState">
                <template v-slot:label>
                    Password <span class="text-danger">*</span>
                </template>
                <b-form-input 
                    id="password" 
                    class="col-md-8" 
                    type="password" 
                    v-model="form.password" 
                    required 
                    :state="passwordValidationState" 
                    :disabled="isLoading"></b-form-input>
            </b-form-group>

            <b-form-group 
                label-cols-md="4"
                label-align-md="right"
                label-for="password-confirmation" 
                :invalid-feedback="passwordConfirmationValidationError" 
                :state="passwordConfirmationValidationState">
                <template v-slot:label>
                    Confirm Password <span class="text-danger">*</span>
                </template>
                <b-form-input 
                    id="password-confirmation" 
                    class="col-md-8" 
                    type="password" 
                    v-model="form.passwordConfirmation" 
                    required 
                    :state="passwordConfirmationValidationState" 
                    :disabled="isLoading"></b-form-input>
            </b-form-group>

            <b-alert variant="warning" fade dismissible :show="hasMessage" @dismissed="resetMessage()">
                <b-icon-exclamation-triangle-fill></b-icon-exclamation-triangle-fill>
                {{ message }}
            </b-alert>

            <template v-slot:footer>
                <div class="form-row">
                    <b-col md="8" offset-md="4">
                        <b-button type="submit" variant="primary" @click="onSubmit" :disabled="isLoading">
                            Register
                            <b-spinner v-show="isLoading" small></b-spinner>
                        </b-button>
                    </b-col>
                </div>
            </template>
        </b-card>
    </b-form>
</template>

<script lang="ts">
    import {Component, Mixins, Watch} from 'vue-property-decorator';
    import {AxiosError, AxiosResponse} from 'axios';
    import Loader from '@/shared/Loader'
    import Messager from '@/shared/Messager'
    import Validator from '@/shared/Validator'
    import {checkNickName, register, RegisterRequestInterface, RegisterResponseInterface} from "@/api/register";
    import {ErrorResponseInterface, ValidationResponseInterface} from "@/api/responses";

    @Component
    export default class Register extends Mixins(Loader, Messager, Validator) {
        form!: RegisterRequestInterface
        isNickNameValid: boolean|null = null

        data() {
            return {
                form: {
                    name: '',
                    lastName: '',
                    nickName: '',
                    email: '',
                    password: '',
                    passwordConfirmation: '',
                },
                
            }
        }

        @Watch('form.name')
        onNameChanged() {
            this.resetValidationMessage('name')
        }

        @Watch('form.lastName')
        onLastNameChanged() {
            this.resetValidationMessage('lastName')
        }

        @Watch('form.nickName')
        onNickNameChanged() {
            this.resetValidationMessage('nickName')
            this.isNickNameValid = null
            this.validateNickName()
        }

        validateNickName() {
            checkNickName(this.form)
                .then(() => {
                    this.isNickNameValid = true
                })
                .catch((error: AxiosError) => {
                    this.isNickNameValid = false

                    if (error.response && error.response.status === 422 && error.response.data?.errors?.nickName) {
                        this.setValidationMessages({nickName: error.response.data?.errors?.nickName})
                    }
                })
        }

        @Watch('form.email')
        onEmailChanged() {
            this.resetValidationMessage('email')
        }

        @Watch('form.password')
        onPasswordChanged() {
            this.resetValidationMessage('password')
        }

        @Watch('form.passwordConfirmation')
        onPasswordConfirmationChanged() {
            this.resetValidationMessage('passwordConfirmation')
        }


        protected onSubmit(event: Event) {
            event.preventDefault()
            event.stopPropagation()

            this.resetValidationMessages()
            this.resetMessage()
            this.setLoading()

            register(this.form)
                .then(this.onSuccess)
                .catch(this.dispatchError)
                .finally(this.setLoaded)
        }

        protected onSuccess(response: AxiosResponse<RegisterResponseInterface>) {
            console.log(response.data.accessToken)
            console.log(response.data.refreshToken)
        }

        protected dispatchError(error: AxiosError): AxiosError {
            if (error.response) {
                switch (error.response.status) {
                    case 400:
                        this.onBadRequestResponse(error.response.data)
                        break;
                    case 401:
                        this.onUnauthorisedResponse(error.response.data)
                        break;
                    case 403:
                        this.onForbiddenResponse(error.response.data)
                        break;
                    case 422:
                        this.onUnprocessableEntityResponse(error.response.data)
                        break;
                    case 500:
                        this.onInternalServerError(error.response.data)

                }
            } else if (!error.response) {
                console.log("Unexpected Error: ", error.message)
            }

            return error
        }

        protected onBadRequestResponse(response: ErrorResponseInterface) {
            this.setMessage(response.message)
            console.log('bad request: ', response.message)
            if (response.error) {
                console.log(response.error)
            }
        }

        protected onUnauthorisedResponse(response: ErrorResponseInterface) {
            this.setMessage(response.message)
            console.log('unauthorised: ', response.message)
            if (response.error) {
                console.log(response.error)
            }
        }

        protected onForbiddenResponse(response: ErrorResponseInterface) {
            this.setMessage(response.message)
            console.log('unauthorised: ', response.message)
            if (response.error) {
                console.log(response.error)
            }
        }

        protected onUnprocessableEntityResponse(response: ValidationResponseInterface) {
            this.setValidationMessages(response.errors)
        }

        protected onInternalServerError(response: ErrorResponseInterface) {
            this.setMessage(response.message)
            console.log('internal server error: ', response.message)
            if (response.error) {
                console.log(response.error)
            }
        }

        // FIXME. Is there other way to bind for reactive fields in component?
        get nameValidationError(): string {
            return this.getValidationMessage('name')
        }

        get nameValidationState(): boolean|null {
            return this.hasValidationMessage('name') ? false : null
        }

        get lastNameValidationError(): string {
            return this.getValidationMessage('lastName')
        }

        get lastNameValidationState(): boolean|null {
            return this.hasValidationMessage('lastName') ? false : null
        }

        get nickNameValidationError(): string {
            return this.getValidationMessage('nickName')
        }

        get nickNameValidationState(): boolean|null {
            return this.hasValidationMessage('nickName') ? false : null
        }

        get emailValidationError(): string {
            return this.getValidationMessage('email')
        }

        get emailValidationState(): boolean|null {
            return this.hasValidationMessage('email') ? false : null
        }

        get passwordValidationError(): string {
            return this.getValidationMessage('password')
        }

        get passwordValidationState(): boolean|null {
            return this.hasValidationMessage('password') ? false : null
        }

        get passwordConfirmationValidationError(): string {
            return this.getValidationMessage('passwordConfirmation')
        }

        get passwordConfirmationValidationState(): boolean|null {
            return this.hasValidationMessage('passwordConfirmation') ? false : null
        }
    }
</script>

<style scoped>

</style>