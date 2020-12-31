<template>
    <b-form novalidate @submit="onSubmit">
        <b-card footer-tag="footer" header-tag="header">
            <template v-slot:header>
                <div class="text-sm-center">
                    <b>Profile Settings</b>
                </div>
            </template>

            <b-form-group
                label-align-sm="right"
                label-cols-sm="4"
                label-for="name"
                :invalid-feedback="validationMessage('name')"
                :state="validationState('name')"
                description="To display on site, emails, reports"
            >
                <template v-slot:label>Name</template>
                <b-form-input
                    id="name"
                    v-model="form.name"
                    required
                    type="text"
                    :disabled="isLoading"
                    :state="validationState('name')"
                    @change="resetValidationMessage('name')"
                ></b-form-input>
            </b-form-group>

            <b-form-group
                label-align-sm="right"
                label-cols-sm="4"
                label-for="lastName"
                :invalid-feedback="validationMessage('lastName')"
                :state="validationState('lastName')"
                description="Same as name :)"
            >
                <template v-slot:label>Last Name</template>
                <b-form-input
                    id="lastName"
                    v-model="form.lastName"
                    required
                    type="text"
                    :disabled="isLoading"
                    :state="validationState('lastName')"
                    @change="resetValidationMessage('lastName')"
                ></b-form-input>
            </b-form-group>

            <b-form-group
                label-align-sm="right"
                label-cols-sm="4"
                label-for="nickName"
                :invalid-feedback="validationMessage('nickName')"
                :state="nickNameValidationState"
                description="Your unique identification. Will be used in some URLs, mentions, etc."
            >
                <template v-slot:label>Nick Name</template>
                <b-form-input
                    id="nickName"
                    v-model="form.nickName"
                    required
                    type="text"
                    debounce="1000"
                    :disabled="isLoading"
                    :state="nickNameValidationState"
                    @change="resetValidationMessage('nickName')"
                ></b-form-input>
            </b-form-group>

            <b-form-group
                label-align-sm="right"
                label-cols-sm="4"
                label-for="defaultCurrencyCode"
                :invalid-feedback="validationMessage('defaultCurrencyCode')"
                :state="validationState('defaultCurrencyCode')"
                description="Your local currency that you're using most of time. Will be used for new wallets as default currency."
            >
                <template v-slot:label>Default Currency</template>
                <b-form-select
                    id="defaultCurrencyCode"
                    v-model="form.defaultCurrencyCode"
                    required
                    type="text"
                    :disabled="isLoading"
                    :state="validationState('defaultCurrencyCode')"
                    @change="resetValidationMessage('defaultCurrencyCode')"
                >
                    <b-form-select-option
                        v-for="currency of currencies"
                        v-bind:key="currency.code"
                        :value="currency.code"
                    >
                        {{ currency.code }}
                    </b-form-select-option>
                </b-form-select>
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
                <div class="text-sm-center">
                    <b-button variant="primary" type="submit" :disabled="isLoading">
                        Update Profile
                        <b-spinner v-show="isLoading" small></b-spinner>
                    </b-button>
                </div>
            </template>
        </b-card>
    </b-form>
</template>

<script lang="ts">
import { Mixins, Component, Watch } from 'vue-property-decorator';
import Loader from "@/shared/Loader";
import Messager from "@/shared/Messager";
import Validator from "@/shared/Validator";
import { currenciesGet, CurrencyInterface } from "@/api/currency";
import { profilePut, profileCheckNickName, UpdateProfileRequestInterface} from "@/api/profile";
import { MutationPayload } from "vuex";

@Component
export default class ProfileSettings extends Mixins(Loader, Messager, Validator) {
    form: UpdateProfileRequestInterface = {
        name: '',
        lastName: '',
        nickName: '',
        defaultCurrencyCode: '',
    }

    isNickNameValid: boolean | null = null

    currencies: Array<CurrencyInterface> = []

    successMessage = ''

    mounted() {
        this.loadProfile()
        this.loadCurrencies()

        if (this.$store.state.isLogged) {
            this.loadProfile()
        } else {
            this.$store.subscribe(this.onProfileLoaded)
        }
    }

    protected onProfileLoaded(mutation: MutationPayload) {
        if (mutation.type !== 'login') {
            return
        }

        this.loadProfile()
    }

    protected loadProfile() {
        this.form.name = this.$store.state.profile.name
        this.form.lastName = this.$store.state.profile.lastName
        this.form.nickName = this.$store.state.profile.nickName
        this.form.defaultCurrencyCode = this.$store.state.profile.defaultCurrencyCode
    }

    protected loadCurrencies() {
        currenciesGet().then(response => {
            this.currencies = response.data.data
        }).catch(this.dispatchError)
    }

    @Watch('form.nickName')
    onNickNameChanged() {
        if (this.$store.state.profile.nickName === this.form.nickName) {
            return
        }

        this.isNickNameValid = null
        this.validateNickName()
    }

    get nickNameValidationState(): boolean | null {
        if (this.isNickNameValid !== null) {
            return this.isNickNameValid
        }

        return this.validationState('nickName')
    }

    protected validateNickName() {
        profileCheckNickName({
            nickName: this.form.nickName
        }).then(() => {
            this.isNickNameValid = true
        }).catch(error => {
            this.isNickNameValid = false

            if (
                error.response &&
                error.response.status === 422 &&
                error.response.data?.errors?.nickName
            ) {
                this.setValidationMessages({
                    nickName: error.response.data?.errors?.nickName,
                })
            }
        })
    }

    protected onSubmit(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.resetValidationMessages()
        this.resetMessage()
        this.setLoading()
        this.successMessage = ''

        profilePut(this.form)
            .then(this.onSuccess)
            .catch(this.dispatchError)
            .finally(this.setLoaded)
    }

    protected onSuccess() {
        this.$store.dispatch('loadProfile').finally(this.loadProfile)
        this.successMessage = 'Your profile has been updated'
    }
}
</script>

<style scoped>

</style>