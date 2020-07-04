<template>
    <div class="row">
        <div class="col-md-8 ml-md-auto mr-md-auto">
            <b-form @submit="onSubmit" novalidate>
                <b-card header-tag="header" footer-tag="footer">
                    <template v-slot:header>
                        Forgot Password
                    </template>

                    <b-form-group label-cols-md="4"
                                  label-align-md="right"
                                  label-for="email">
                        <template v-slot:label>
                            Email
                        </template>
                        <b-form-input id="email" class="col-md-8" type="email" v-model="form.email" required></b-form-input>
                    </b-form-group>

                    <template v-slot:footer>
                        <div class="form-row">
                            <b-col md="8" offset-md="4">
                                <b-button type="submit" variant="primary" @click="onSubmit">Send Password Reset Link</b-button>
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

    interface ForgotPasswordFormInterface {
        email: string;
    }

    @Component
    export default class ForgotPassword extends Vue {
        form!: ForgotPasswordFormInterface

        data() {
            return {
                form: {
                    email: '',
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
