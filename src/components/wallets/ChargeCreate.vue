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
                                 autocomplete="off"
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
                <b-form-group :invalid-feedback="validationMessage('title')"
                              :state="validationState('title')">
                    <b-input type="text"
                             id="title"
                             placeholder="Title"
                             required
                             v-model="form.title"
                             :disabled="isLoading"
                             :state="validationState('title')"
                             @change="resetValidationMessage('title')"
                    ></b-input>
                </b-form-group>
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
                                :validation-state="validationState(['tags'])"
                                :validation-message="validationMessage(['tags'])"
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
import { TagInterface } from '@/api/tags';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import Tag from '@/components/tags/Tag.vue';
import CreateTag from '@/components/tags/CreateTag.vue';
import TagFormInput from '@/components/tags/TagFormInput.vue';

export interface ChargeCreatedEvent {
    charge: ChargeInterface;
}

@Component({
    components: {WarningMessage, Tag, CreateTag, TagFormInput}
})
export default class ChargeCreate extends Mixins(Loader, Messager, Validator) {
    @Prop()
    wallet!: WalletInterface

    form: ChargeCreateRequestInterface = {
        type: TypeExpense,
        amount: null,
        title: '',
        description: '',
        tags: [],
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
            tags: [],
        }
    }
}
</script>

<style lang="scss" scoped>

</style>
