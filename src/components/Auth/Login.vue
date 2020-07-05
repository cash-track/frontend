<template>
    <b-form @submit="onSubmit" novalidate>
        <b-card header-tag="header" footer-tag="footer">
            <template v-slot:header>
                Login
            </template>

            <b-form-group label-cols-md="4"
                          label-align-md="right"
                          label-for="login"
                          :invalid-feedback="loginValidationError"
                          :state="loginValidationState">
                <template v-slot:label>
                    Login
                </template>
                <b-form-input id="login"
                              class="col-md-8"
                              type="text"
                              v-model="form.login"
                              required
                              :state="loginValidationState"
                              :disabled="loading"></b-form-input>
            </b-form-group>

            <b-form-group label-cols-md="4"
                          label-align-md="right"
                          label-for="password"
                          :invalid-feedback="passwordValidationError"
                          :state="passwordValidationState">
                <template v-slot:label>
                    Password
                </template>
                <b-form-input id="password"
                              class="col-md-8"
                              type="password"
                              v-model="form.password"
                              required
                              :state="passwordValidationState"
                              :disabled="loading"></b-form-input>
            </b-form-group>

            <b-form-group label-cols-md="4">
                <b-form-checkbox v-model="form.remember" :disabled="loading">Remember Me</b-form-checkbox>
            </b-form-group>

            <b-alert variant="warning" fade dismissible :show="hasMessage" @dismissed="message = ''">
                <b-icon-exclamation-triangle-fill></b-icon-exclamation-triangle-fill>
                {{ message }}
            </b-alert>

            <template v-slot:footer>
                <div class="form-row">
                    <b-col md="8" offset-md="4">
                        <b-button type="submit" variant="primary" @click="onSubmit" :disabled="loading">
                            Login
                            <b-spinner v-show="loading" small></b-spinner>
                        </b-button>
                        <b-button variant="link" :to="{name: 'forgot-password'}">Forgot Your Password?</b-button>
                    </b-col>
                </div>
            </template>
        </b-card>
    </b-form>
</template>

<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator';
    import axios, {AxiosError, AxiosResponse} from 'axios';

    interface LoginFormInterface {
        login: string;
        password: string;
        remember: boolean;
    }

    interface EntityIDResponseInterface {
        type: string;
        id: string|number;
    }

    interface ValidationResponseInterface {
        errors: Record<string, string>;
    }

    interface ErrorResponseInterface {
        error?: string;
        message: string;
    }

    interface LoginResponseInterface {
        data: EntityIDResponseInterface;
        accessToken: string;
        accessTokenExpiredAt: string;
        refreshToken: string;
        refreshTokenExpiredAt: string;
    }

    @Component
    export default class Login extends Vue {
        form!: LoginFormInterface
        validation!: Record<string, string>
        showMessage = false
        message = ''
        loading = false

        data() {
            return {
                form: {
                    login: '',
                    password: '',
                    remember: false,
                },
                validation: {},
            }
        }

        protected onSubmit(event: Event) {
            event.preventDefault()
            event.stopPropagation()

            console.log('submit')
            console.log(JSON.stringify(this.form))

            this.resetValidationErrors()

            this.showMessage = false
            this.message = ''

            this.loading = true

            axios.request({
                url: '/auth/login',
                method: 'POST',
                baseURL: process.env.VUE_APP_API_URL,
                data: {
                    email: this.form.login,
                    password: this.form.password,
                },
            }).then(this.onSuccess)
                .catch(this.dispatchError)
                .finally(() => this.loading = false)
        }

        protected onSuccess(response: AxiosResponse<LoginResponseInterface>) {
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
            this.message = response.message
            console.log('bad request: ', response.message)
            if (response.error) {
                console.log(response.error)
            }
        }

        protected onUnauthorisedResponse(response: ErrorResponseInterface) {
            this.message = response.message
            console.log('unauthorised: ', response.message)
            if (response.error) {
                console.log(response.error)
            }
        }

        protected onForbiddenResponse(response: ErrorResponseInterface) {
            this.message = response.message
            console.log('unauthorised: ', response.message)
            if (response.error) {
                console.log(response.error)
            }
        }

        protected onUnprocessableEntityResponse(response: ValidationResponseInterface) {
            this.validation = response.errors
        }

        protected onInternalServerError(response: ErrorResponseInterface) {
            this.message = response.message
            console.log('internal server error: ', response.message)
            if (response.error) {
                console.log(response.error)
            }
        }


        protected resetValidationErrors(): void {
            this.validation = {};
        }

        protected hasValidationError(field: string): boolean {
            return Object.keys(this.validation).filter(key => key === field).length > 0
        }

        protected getValidationError(field: string): string {
            if (this.hasValidationError(field)) {
                return this.validation[field]
            }

            return ''
        }

        get hasMessage(): boolean {
            return this.message !== ''
        }

        get loginValidationError(): string {
            return this.getValidationError('email')
        }

        get loginValidationState(): boolean|null {
            return this.hasValidationError('email') ? false : null
        }

        get passwordValidationError(): string {
            return this.getValidationError('password')
        }

        get passwordValidationState(): boolean|null {
            return this.hasValidationError('password') ? false : null
        }
    }
</script>

<style scoped lang="scss">

</style>
