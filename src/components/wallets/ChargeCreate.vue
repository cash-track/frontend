<template>
    <b-form novalidate @submit="onSubmit">
        <b-row>
            <b-col md="4">
                <b-form-group
                    label="Amount"
                    label-for="amount"
                    description="Set the amount of charge. Can be with decimal part"
                    :invalid-feedback="validationMessage('amount')"
                    :state="validationState('amount')"
                >
                    <b-input type="number"
                             id="amount"
                             required
                             min="0"
                             v-model="form.amount"
                             :disabled="isLoading"
                             :state="validationState('amount')"
                             @change="resetValidationMessage('amount')"
                    ></b-input>
                </b-form-group>
            </b-col>
            <b-col md="8">
                <b-form-group
                    label="Type"
                    description="Set type of charge, this is income or expense"
                    :invalid-feedback="validationMessage('type')"
                    :state="validationState('type')"
                >
                    <b-form-radio-group
                        buttons
                        button-variant="primary"
                        class="btn-block"
                        v-model="form.type"
                        :options="typeOptions"
                        :disabled="isLoading"
                        :state="validationState('type')"
                        @change="resetValidationMessage('type')"
                    ></b-form-radio-group>
                </b-form-group>
            </b-col>
            <b-col md="12">
                <b-form-group
                    label="Title"
                    label-for="title"
                    description="Short description of operation"
                    :invalid-feedback="validationMessage('title')"
                    :state="validationState('title')"
                >
                    <b-input
                        type="text"
                        id="title"
                        required
                        v-model="form.title"
                        :disabled="isLoading"
                        :state="validationState('title')"
                        @change="resetValidationMessage('title')"
                    ></b-input>
                </b-form-group>
            </b-col>
            <b-col md="12">
                <b-form-group
                    label="Description"
                    label-for="description"
                    description="Put here some notes for remember for what you lost this money or leave empty"
                    :invalid-feedback="validationMessage('description')"
                    :state="validationState('description')"
                >
                    <b-textarea
                        id="description"
                        v-model="form.description"
                        :disabled="isLoading"
                        :state="validationState('description')"
                        @change="resetValidationMessage('description')"
                    ></b-textarea>
                </b-form-group>
            </b-col>
            <b-col md="12">
                <warning-message :message="message" :show="hasMessage"></warning-message>
            </b-col>
            <b-col md="12">
                <b-button variant="primary" type="submit" class="mr-1" :disabled="isLoading">
                    Create
                    <b-spinner v-show="isLoading" small></b-spinner>
                </b-button>
                <b-button variant="secondary" v-b-toggle.charge-create :disabled="isLoading">Cancel</b-button>
            </b-col>
        </b-row>
    </b-form>
</template>

<script lang="ts">
import { Mixins, Component, Prop } from 'vue-property-decorator'
import { AxiosResponse } from 'axios';
import Loader from '@/shared/Loader';
import Messager from '@/shared/Messager';
import Validator from '@/shared/Validator';
import { WalletInterface } from '@/api/wallets';
import {
    walletChargeCreate,
    TypeIncome,
    TypeExpense,
    ChargeCreateRequestInterface,
    ChargeResponseInterface,
    ChargeInterface
} from '@/api/charges';
import WarningMessage from '@/components/shared/WarningMessage.vue';

export interface ChargeCreatedEvent {
    charge: ChargeInterface;
}

@Component({
    components: {WarningMessage}
})
export default class ChargeCreate extends Mixins(Loader, Messager, Validator) {
    @Prop()
    wallet!: WalletInterface

    form: ChargeCreateRequestInterface = {
        type: TypeExpense,
        amount: null,
        title: '',
        description: '',
    }

    get typeOptions() {
        return [
            {
                text: 'Expense (-)',
                value: TypeExpense,
            },
            {
                text: 'Income (+)',
                value: TypeIncome,
            },
        ]
    }

    protected onSubmit(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.resetValidationMessages()
        this.resetMessage()
        this.setLoading()

        walletChargeCreate(this.wallet.id, this.form)
            .then(this.onSuccess)
            .catch(this.dispatchError)
            .finally(this.setLoaded)
    }

    protected onSuccess(response: AxiosResponse<ChargeResponseInterface>) {
        this.$emit('created', {
            charge: response.data.data,
        })

        this.form = {
            type: TypeExpense,
            amount: null,
            title: '',
            description: '',
        }
    }
}
</script>

<style scoped>

</style>