<template>
    <b-form novalidate @submit="onSubmit">
        <b-row>
            <b-col xl="5" lg="6">
                <b-form-group :invalid-feedback="validationMessage(['type', 'amount'])"
                              :state="validationState(['type', 'amount'])">
                    <b-input-group>
                        <b-input-group-prepend>
                            <b-button variant="outline-danger"
                                      @click="onTypeChangedExpense"
                                      :disabled="isLoading"
                                      :class="{'active': isTypeExpense}">
                                <b-icon icon="arrow-down" />
                            </b-button>
                            <b-button variant="outline-success"
                                      @click="onTypeChangedIncome"
                                      :disabled="isLoading"
                                      :class="{'active': isTypeIncome}">
                                <b-icon icon="arrow-up" />
                            </b-button>
                        </b-input-group-prepend>
                        <b-input type="number"
                                 id="amount"
                                 required
                                 no-wheel
                                 min="0"
                                 v-model="form.amount"
                                 :disabled="isLoading"
                                 :state="validationState('amount')"
                                 @change="resetValidationMessage('amount')"
                                 placeholder="Amount"
                        ></b-input>
                    </b-input-group>
                </b-form-group>
            </b-col>

            <b-col xl="7">
                <charge-title-form-input v-model="form.title"
                                         :tags="form.tags"
                                         :disabled="isLoading"
                                         :reset-state="resetState"
                                         :validation-state="validationState('title')"
                                         :validation-message="validationMessage('title')"
                                         @selected="onTagSelected"
                ></charge-title-form-input>
            </b-col>
            <b-col md="12">
                <b-form-group v-if="form.tags.length">
                    <tag v-for="tag of form.tags"
                         :tag="tag"
                         :key="tag.id"
                         state="closable"
                         @selected="onTagRemoved"
                    ></tag>
                </b-form-group>
            </b-col>
            <b-col md="12">
                <tag-form-input :wallet-id="wallet.id"
                                :tags="form.tags"
                                :disabled="isLoading"
                                :reset-state="resetState"
                                :validation-state="validationState('tags')"
                                :validation-message="validationMessage('tags')"
                                @selected="onTagSelected"
                ></tag-form-input>
            </b-col>
            <b-col md="12">
                <b-form-group
                    label-for="description"
                    :invalid-feedback="validationMessage('description')"
                    :state="validationState('description')"
                >
                    <b-textarea
                        id="description"
                        v-model="form.description"
                        :disabled="isLoading"
                        placeholder="Description"
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
                    Update
                    <b-spinner v-show="isLoading" small></b-spinner>
                </b-button>
                <b-button variant="secondary" :disabled="isLoading" @click="onCancelled">Cancel</b-button>
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
    walletChargeUpdate,
    TypeIncome,
    TypeExpense,
    ChargeCreateRequestInterface,
    ChargeResponseInterface,
    ChargeInterface
} from '@/api/charges';
import { TagInterface } from '@/api/tags';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import TagFormInput from '@/components/tags/TagFormInput.vue';
import Tag from '@/components/tags/Tag.vue';
import ChargeTitleFormInput from '@/components/wallets/charges/ChargeTitleFormInput.vue';

export interface ChargeUpdatedEvent {
    id: string;
    charge: ChargeInterface;
}

@Component({
    components: {WarningMessage, Tag, TagFormInput, ChargeTitleFormInput}
})
export default class ChargeEdit extends Mixins(Loader, Messager, Validator) {
    @Prop()
    wallet!: WalletInterface

    @Prop()
    charge!: ChargeInterface

    form: ChargeCreateRequestInterface = {
        type: TypeExpense,
        amount: null,
        title: '',
        description: '',
        tags: [],
    }

    resetState = false

    mounted() {
        this.form = {
            type: this.charge.operation,
            amount: this.charge.amount,
            title: this.charge.title,
            description: this.charge.description,
            tags: this.charge.tags,
        }
    }

    get isTypeIncome(): boolean {
        return this.form.type === TypeIncome
    }

    get isTypeExpense(): boolean {
        return this.form.type === TypeExpense
    }

    protected onTypeChangedExpense(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.resetValidationMessage('type')
        this.onTypeChanged(TypeExpense)
    }

    protected onTypeChangedIncome(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.resetValidationMessage('type')
        this.onTypeChanged(TypeIncome)
    }

    protected onTypeChanged(type: string) {
        if (type !== TypeIncome && type !== TypeExpense) {
            return
        }

        this.form.type = type
    }

    protected onTagSelected(tag: TagInterface) {
        this.form.tags.unshift(tag)
        this.resetValidationMessage('tags')
    }

    protected onTagRemoved(tag: TagInterface) {
        const index = this.form.tags.indexOf(tag)

        if (index === -1) {
            return
        }

        this.form.tags.splice(index, 1)
    }

    protected onSubmit(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.resetValidationMessages()
        this.resetMessage()
        this.setLoading()

        walletChargeUpdate(this.wallet.id, this.charge.id, this.form)
            .then(this.onSuccess)
            .catch(this.dispatchError)
            .finally(this.setLoaded)
    }

    protected onSuccess(response: AxiosResponse<ChargeResponseInterface>) {
        this.$emit('updated', {
            id: response.data.data.id,
            charge: response.data.data,
        })

        this.form = {
            type: response.data.data.operation,
            amount: response.data.data.amount,
            title: response.data.data.title,
            description: response.data.data.description,
            tags: response.data.data.tags,
        }

        this.resetState = !this.resetState
    }

    protected onCancelled(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.$emit('cancelled')
    }
}
</script>

<style scoped>

</style>
