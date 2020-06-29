<template>
    <div class="row">
        <div class="col-md-8 ml-md-auto mr-md-auto">
            <b-form @submit="onSubmit" novalidate>
                <b-card header-tag="header" footer-tag="footer">
                    <template v-slot:header>
                        Register
                    </template>

                    <b-form-group label-cols-md="4"
                                  label-align-sm="right"
                                  label-for="name">
                        <template v-slot:label>
                            Name: <span class="text-danger">*</span>
                        </template>
                        <b-form-input id="name" class="col-md-8" v-model="form.name" required></b-form-input>
                    </b-form-group>

                    <b-form-group label-cols-md="4"
                                  label-align-sm="right"
                                  label-for="last-name">
                        <template v-slot:label>
                            Last Name:
                        </template>
                        <b-form-input id="last-name" class="col-md-8" v-model="form.lastName"></b-form-input>
                    </b-form-group>

                    <b-form-group label-cols-md="4"
                                  label-align-sm="right"
                                  label-for="nick-name">
                        <template v-slot:label>
                            Nick Name: <span class="text-danger">*</span>
                        </template>
                        <b-form-input id="nick-name" class="col-md-8" v-model="form.nickName" required></b-form-input>
                    </b-form-group>

                    <b-form-group label-cols-md="4"
                                  label-align-sm="right"
                                  label-for="email">
                        <template v-slot:label>
                            Email: <span class="text-danger">*</span>
                        </template>
                        <b-form-input id="email" class="col-md-8" type="email" v-model="form.email" required></b-form-input>
                    </b-form-group>

                    <b-form-group label-cols-md="4"
                                  label-align-sm="right"
                                  label-for="password">
                        <template v-slot:label>
                            Password: <span class="text-danger">*</span>
                        </template>
                        <b-form-input id="password" class="col-md-8" type="password" v-model="form.password" required></b-form-input>
                    </b-form-group>

                    <b-form-group label-cols-md="4"
                                  label-align-sm="right"
                                  label-for="password-confirmation">
                        <template v-slot:label>
                            Confirm Password: <span class="text-danger">*</span>
                        </template>
                        <b-form-input id="password-confirmation" class="col-md-8" type="password" v-model="form.passwordConfirmation" required></b-form-input>
                    </b-form-group>

                    <template v-slot:footer>
                        <div class="form-row">
                            <b-col md="8" offset-md="4">
                                <b-button type="submit" variant="primary" @click="onSubmit">Register</b-button>
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

    interface RegisterFormInterface {
        name: string;
        lastName: string;
        nickName: string;
        email: string;
        password: string;
        passwordConfirmation: string;
    }

    @Component
    export default class Register extends Vue {
        form!: RegisterFormInterface

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
