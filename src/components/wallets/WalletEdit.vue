<template>
    <b-form novalidate @submit="onSubmit" class="wallet-update">
        <b-card footer-tag="footer" header-tag="header">
            <template v-slot:header>Edit Wallet</template>

            <b-form-group
                label-align-md="right"
                label-cols-md="2"
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
                label-align-sm="right"
                label-cols-sm="2"
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
                    <b-button variant="secondary" :to="{name: 'wallets.show', params: {walletID: wallet.id.toString()}}">
                        Cancel
                    </b-button>

                    <b-button
                        :disabled="isLoading"
                        type="submit"
                        variant="primary"
                        @click="onSubmit"
                    >
                        Update
                        <b-spinner v-show="isLoading" small></b-spinner>
                    </b-button>
                </div>
            </template>
        </b-card>
    </b-form>
</template>

<script lang="ts">
import {Component, Mixins, Prop, Watch} from 'vue-property-decorator'
import { AxiosResponse } from 'axios';
import Loader from '@/shared/Loader';
import Messager from '@/shared/Messager';
import Validator from '@/shared/Validator';
import {
    walletUpdate,
    WalletInterface,
    WalletResponseInterface,
    WalletUpdateRequestInterface
} from '@/api/wallets';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import { currenciesGet, CurrencyInterface } from '@/api/currency';

@Component({
    components: {WarningMessage}
})
export default class WalletEdit extends Mixins(Loader, Messager, Validator) {
    @Prop({
        required: true
    })
    wallet!: WalletInterface

    form: WalletUpdateRequestInterface = {
        name: '',
        isPublic: false,
        defaultCurrencyCode: '',
    }

    currencies: Array<CurrencyInterface> = []

    mounted() {
        this.loadCurrencies()
    }

    @Watch('wallet')
    protected onWalletLoaded() {
        this.form = {
            name: this.wallet.name,
            isPublic: this.wallet.isPublic,
            defaultCurrencyCode: this.wallet.defaultCurrencyCode
        }
    }

    protected loadCurrencies() {
        currenciesGet().then(response => {
            this.currencies = response.data.data
        }).catch(this.dispatchError)
    }

    protected onSubmit(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.resetValidationMessages()
        this.resetMessage()
        this.setLoading()

        walletUpdate(this.wallet.id, this.form)
            .then(this.onSuccess)
            .catch(this.dispatchError)
            .finally(this.setLoaded)
    }

    protected onSuccess(response: AxiosResponse<WalletResponseInterface>) {
        this.$router.push({
            name: 'wallets.show',
            params: {
                walletID: response.data.data.id.toString(),
            }
        })
    }
}
</script>

<style lang="scss" scoped>
.wallet-update .card-footer button {
    margin: 0 5px;
}
</style>