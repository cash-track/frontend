<template>
    <b-form novalidate @submit="onSubmit" class="wallet-create">
        <b-card footer-tag="footer" header-tag="header">
            <template v-slot:header>Create Wallet</template>

            <b-form-group
                label-align-lg="right"
                label-cols-lg="2"
                label-for="name"
                :invalid-feedback="validationMessage('name')"
                :state="validationState('name')"
            >
                <template v-slot:label>Name</template>
                <b-form-input
                    id="name"
                    v-model="form.name"
                    class="col-md-12"
                    required
                    type="text"
                    :disabled="isLoading"
                    :state="validationState('name')"
                    @change="resetValidationMessage('name')"
                ></b-form-input>
            </b-form-group>

            <b-form-group
                label-align-lg="right"
                label-cols-lg="2"
                label-for="defaultCurrencyCode"
                :invalid-feedback="validationMessage('defaultCurrencyCode')"
                :state="validationState('defaultCurrencyCode')"
                description="Default currency for this wallet. You still may create charge using custom currency"
            >
                <template v-slot:label>Currency</template>
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

            <b-form-group label-cols-md="2">
                <b-form-checkbox v-model="form.isPublic" :disabled="isLoading">
                    Is Public
                </b-form-checkbox>
            </b-form-group>

            <warning-message :message="message" :show="hasMessage" @dismissed="resetMessage"></warning-message>

            <template v-slot:footer>
                <div class="text-center">
                    <b-button variant="secondary" :to="{name: 'wallets'}">
                        Cancel
                    </b-button>

                    <b-button
                        :disabled="isLoading"
                        type="submit"
                        variant="primary"
                        @click="onSubmit"
                    >
                        Create
                        <b-spinner v-show="isLoading" small></b-spinner>
                    </b-button>
                </div>
            </template>
        </b-card>
    </b-form>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { AxiosResponse } from 'axios';
import Loader from '@/shared/Loader';
import Messager from '@/shared/Messager';
import Validator from '@/shared/Validator';
import { walletCreate, WalletCreateRequestInterface, WalletResponseInterface } from '@/api/wallets';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import { currenciesGet, CurrencyInterface } from '@/api/currency';

@Component({
    components: {WarningMessage}
})
export default class WalletCreate extends Mixins(Loader, Messager, Validator) {
    form: WalletCreateRequestInterface = {
        name: '',
        slug: '',
        isPublic: false,
        defaultCurrencyCode: '',
    }

    currencies: Array<CurrencyInterface> = []

    unsubscribeFromStore: Function|null = null

    mounted() {
        this.loadCurrencies()

        if (this.$store.state.isLogged) {
            this.loadDefaultCurrency()
        } else {
            this.unsubscribeFromStore = this.$store.subscribe(this.loadDefaultCurrency)
        }
    }

    protected loadCurrencies() {
        currenciesGet().then(response => {
            this.currencies = response.data.data
        }).catch(this.dispatchError)
    }

    protected loadDefaultCurrency() {
        if (typeof this.unsubscribeFromStore === 'function') {
            this.unsubscribeFromStore()
        }

        this.form.defaultCurrencyCode = this.$store.state.profile.defaultCurrencyCode
    }

    protected onSubmit(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.resetValidationMessages()
        this.resetMessage()
        this.setLoading()

        walletCreate(this.form)
            .then(this.onSuccess)
            .catch(this.dispatchError)
            .finally(this.setLoaded)
    }

    protected onSuccess(response: AxiosResponse<WalletResponseInterface>) {
        this.$router.push({
            name: 'wallets.show',
            params: {
                walletID: response.data.data.id.toString(),
                nameForTitle: this.form.name
            }
        })
    }
}
</script>

<style lang="scss" scoped>
.wallet-create .card-footer button {
    margin: 0 5px;
}
</style>