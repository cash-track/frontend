<template>
    <div class="row">
        <div class="col-md-8 ml-md-auto mr-md-auto">
            <b-form @submit="onSubmit" novalidate>
                <b-card header-tag="header" footer-tag="footer">
                    <template v-slot:header>
                        Login
                    </template>

                    <b-form-group label-cols-md="4"
                                  label-align-md="right"
                                  label-for="login">
                        <template v-slot:label>
                            Login
                        </template>
                        <b-form-input id="login" class="col-md-8" type="text" v-model="form.login" required></b-form-input>
                    </b-form-group>

                    <b-form-group label-cols-md="4"
                                  label-align-md="right"
                                  label-for="password">
                        <template v-slot:label>
                            Password
                        </template>
                        <b-form-input id="password" class="col-md-8" type="password" v-model="form.password" required></b-form-input>
                    </b-form-group>

                    <b-form-group label-cols-md="4">
                        <b-form-checkbox v-model="form.remember">Remember Me</b-form-checkbox>
                    </b-form-group>

                    <template v-slot:footer>
                        <div class="form-row">
                            <b-col md="8" offset-md="4">
                                <b-button type="submit" variant="primary" @click="onSubmit">Login</b-button>
                                <b-button variant="link">Forgot Your Password?</b-button>
                            </b-col>
                        </div>
                    </template>
                </b-card>
            </b-form>
        </div>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator';

    interface LoginFormInterface {
        login: string;
        password: string;
        remember: boolean;
    }

    @Component
    export default class Login extends Vue {
        form!: LoginFormInterface

        data() {
            return {
                form: {
                    login: '',
                    password: '',
                    remember: false,
                },
            }
        }

        protected onSubmit(event: Event) {
            event.preventDefault()
            event.stopPropagation()

            console.log('submit')
            console.log(JSON.stringify(this.form))
        }
    }
</script>

<style scoped lang="scss">

</style>
