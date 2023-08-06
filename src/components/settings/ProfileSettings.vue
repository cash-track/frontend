<template>
    <b-form novalidate @submit="onSubmit">
        <b-card footer-tag="footer" header-tag="header">
            <template v-slot:header>
                <div class="text-md-center">
                    <b>{{ $t('profileSettings.profileSettings') }}</b>
                </div>
            </template>

            <b-form-group
                label-align-lg="right"
                label-cols-lg="4"
                label-for="name"
                :invalid-feedback="validationMessage('name')"
                :state="validationState('name')"
                :description="$t('profileSettings.nameDescription')"
            >
                <template v-slot:label>{{ $t('profileSettings.name') }}</template>
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
                label-align-lg="right"
                label-cols-lg="4"
                label-for="lastName"
                :invalid-feedback="validationMessage('lastName')"
                :state="validationState('lastName')"
                :description="$t('profileSettings.lastNameDescription')"
            >
                <template v-slot:label>{{ $t('profileSettings.lastName') }}</template>
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
                label-align-lg="right"
                label-cols-lg="4"
                label-for="nickName"
                :invalid-feedback="validationMessage('nickName')"
                :state="nickNameValidationState"
                :description="$t('profileSettings.nickNameDescription')"
            >
                <template v-slot:label>{{ $t('profileSettings.nickName') }}</template>
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

            <email-form-input></email-form-input>

            <b-form-group
                label-align-lg="right"
                label-cols-lg="4"
                label-for="defaultCurrencyCode"
                :invalid-feedback="validationMessage('defaultCurrencyCode')"
                :state="validationState('defaultCurrencyCode')"
                :description="$t('profileSettings.defaultCurrencyDescription')"
            >
                <template v-slot:label>{{ $t('profileSettings.defaultCurrency') }}</template>
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

            <b-form-group
                label-align-lg="right"
                label-cols-lg="4"
                label-for="locale"
                :invalid-feedback="validationMessage('locale')"
                :state="validationState('locale')"
                :description="$t('profileSettings.languageDescription')"
            >
                <template v-slot:label>{{ $t('profileSettings.language') }}</template>
                <b-form-select
                    id="locale"
                    v-model="form.locale"
                    required
                    type="text"
                    :disabled="isLoading"
                    :state="validationState('locale')"
                    @change="resetValidationMessage('locale')"
                >
                    <b-form-select-option
                        v-for="l of locales"
                        v-bind:key="l.code"
                        :value="l.code"
                    >
                        {{ l.name }}
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

            <hr>

            <b-form-group label-align-lg="right" label-cols-lg="4">
                <h5>{{ $t('profileSettings.social') }}</h5>
            </b-form-group>

            <b-form-group label-align-lg="right" label-cols-lg="4">
                <template v-slot:label>Google</template>
                <b-form-checkbox switch size="lg" disabled v-model="isGoogleEnabled" class="mt-1"></b-form-checkbox>
            </b-form-group>

            <template v-slot:footer>
                <div class="text-center">
                    <b-button variant="primary" type="submit" :disabled="isLoading">
                        {{ $t('profileSettings.save') }}
                        <b-spinner v-show="isLoading" small></b-spinner>
                    </b-button>
                </div>
            </template>
        </b-card>
    </b-form>
</template>

<script lang="ts">
import { Mixins, Component, Watch } from 'vue-property-decorator';
import { MutationPayload } from "vuex";
import { locales } from '@/lang';
import Loader from '@/shared/Loader';
import Messager from '@/shared/Messager';
import Validator from '@/shared/Validator';
import EmailFormInput from '@/components/settings/EmailFormInput.vue';
import { currenciesGet, CurrencyInterface } from '@/api/currency';
import { profilePut, profileCheckNickName, profileGetSocial, UpdateProfileRequestInterface} from '@/api/profile';

@Component({
    components: {EmailFormInput}
})
export default class ProfileSettings extends Mixins(Loader, Messager, Validator) {
    form: UpdateProfileRequestInterface = {
        name: '',
        lastName: '',
        nickName: '',
        defaultCurrencyCode: '',
        locale: ''
    }

    isNickNameValid: boolean | null = null

    currencies: Array<CurrencyInterface> = []

    successMessage = ''

    unsubscribeFromStore: Function|null = null

    isGoogleEnabled = false

    mounted() {
        this.loadProfile()
        this.loadCurrencies()
        this.loadSocial()

        if (this.$store.state.isLogged) {
            this.loadProfile()
        } else {
            this.unsubscribeFromStore = this.$store.subscribe(this.onProfileLoaded)
        }
    }

    get locales() {
        return locales;
    }

    protected onProfileLoaded(mutation: MutationPayload) {
        if (mutation.type !== 'login') {
            return
        }

        this.loadProfile()
    }

    protected loadProfile() {
        if (typeof this.unsubscribeFromStore === 'function') {
            this.unsubscribeFromStore()
        }

        this.form.name = this.$store.state.profile.name
        this.form.lastName = this.$store.state.profile.lastName
        this.form.nickName = this.$store.state.profile.nickName
        this.form.defaultCurrencyCode = this.$store.state.profile.defaultCurrencyCode
        this.form.locale = this.$store.state.profile.locale
    }

    protected loadCurrencies() {
        currenciesGet().then(response => {
            this.currencies = response.data.data
        }).catch(this.dispatchError)
    }

    protected loadSocial() {
        profileGetSocial().then(response => {
            this.isGoogleEnabled = response.data.data.google
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
        this.successMessage = this.$t('profileSettings.success').toString()
    }
}
</script>

<style scoped>

</style>