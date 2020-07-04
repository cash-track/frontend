<template>
    <div class="row">
        <div class="col-md-8 ml-md-auto mr-md-auto">
            <b-form @submit="onSubmit" novalidate>
                <b-card header-tag="header" footer-tag="footer">
                    <template v-slot:header>
                        Reset Password
                    </template>

                    <b-form-group label-cols-md="4"
                                  label-align-md="right"
                                  label-for="password">
                        <template v-slot:label>
                            Password <span class="text-danger">*</span>
                        </template>
                        <b-form-input id="password" class="col-md-8" type="password" v-model="form.password" required></b-form-input>
                    </b-form-group>

                    <b-form-group label-cols-md="4"
                                  label-align-md="right"
                                  label-for="password-confirmation">
                        <template v-slot:label>
                            Confirm Password <span class="text-danger">*</span>
                        </template>
                        <b-form-input id="password-confirmation" class="col-md-8" type="password" v-model="form.passwordConfirmation" required></b-form-input>
                    </b-form-group>

                    <template v-slot:footer>
                        <div class="form-row">
                            <b-col md="8" offset-md="4">
                                <b-button type="submit" variant="primary" @click="onSubmit">Reset Password</b-button>
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

    interface ResetPasswordFormInterface {
        code: string;
        password: string;
        passwordConfirmation: string;
    }

    @Component
    export default class ResetPassword extends Vue {
        form!: ResetPasswordFormInterface

        mounted() {
            this.form.code = this.$route.params.code

            console.log(this.form.code)
        }

        data() {
            return {
                form: {
                    code: '',
                    password: '',
                    passwordConfirmation: '',
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
