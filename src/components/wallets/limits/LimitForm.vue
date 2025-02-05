<template>
    <b-form novalidate @submit="onSubmit">
        <b-row>
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
            <b-col xl="7">
                <tag-form-input :wallet-id="wallet.id"
                                :tags="form.tags"
                                :disabled="isLoading"
                                :reset-state="resetState"
                                :validation-state="validationState(['tags'])"
                                :validation-message="validationMessage(['tags'])"
                                @selected="onTagSelected"
                ></tag-form-input>
            </b-col>
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
                                 :placeholder="$t('limits.amount')"
                        ></b-input>
                    </b-input-group>
                </b-form-group>
            </b-col>
            <b-col md="12">
                <warning-message :message="message" :show="hasMessage"></warning-message>
            </b-col>
            <b-col md="12">
                <b-button variant="primary" type="submit" class="mr-1" size="sm" :disabled="isLoading">
                    {{ (isEdit ? $t('limits.update') : $t('limits.create')) }}
                    <b-spinner v-show="isLoading" small></b-spinner>
                </b-button>
                <b-button variant="secondary" size="sm" :disabled="isLoading" @click="onCancel">
                    {{ $t('limits.cancel') }}
                </b-button>
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
import { TypeIncome, TypeExpense } from '@/api/charges';
import { TagInterface } from '@/api/tags';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import Tag from '@/components/tags/Tag.vue';
import CreateTag from '@/components/tags/CreateTag.vue';
import TagFormInput from '@/components/tags/TagFormInput.vue';
import ChargeTitleFormInput from '@/components/wallets/charges/ChargeTitleFormInput.vue';
import {
    LimitInterface,
    LimitRequestInterface,
    LimitResponseInterface,
    LimitsRepository,
    LimitsRepositoryInterface
} from '@/api/limits';

export interface LimitCreatedEvent {
    limit: LimitInterface;
}

export interface LimitUpdatedEvent {
    limit: LimitInterface;
}

@Component({
    components: {WarningMessage, Tag, CreateTag, TagFormInput, ChargeTitleFormInput}
})
export default class LimitCreate extends Mixins(Loader, Messager, Validator) {
    @Prop()
    wallet!: WalletInterface

    @Prop()
    edit: LimitInterface|undefined = undefined;

    repository: LimitsRepositoryInterface = new LimitsRepository()

    form: LimitRequestInterface = {
        type: TypeExpense,
        amount: null,
        tags: [],
    }

    resetState = false

    mounted() {
        this.resetForm();
    }

    get isEdit(): boolean {
        return this.edit !== undefined && this.edit.id > 0;
    }

    get isEmailConfirmed(): boolean {
        return this.$store.state.isEmailConfirmed
    }

    get isTypeIncome(): boolean {
        return this.form.type === TypeIncome
    }

    get isTypeExpense(): boolean {
        return this.form.type === TypeExpense
    }

    private loadFormFromInstance(limit: LimitInterface|undefined) {
        this.form.type = limit?.operation ?? TypeExpense
        this.form.amount = limit?.amount ?? null
        this.form.tags = limit?.tags ?? []
    }

    public onTypeChangedExpense(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.resetValidationMessage('type')
        this.onTypeChanged(TypeExpense)
    }

    public onTypeChangedIncome(event: Event) {
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

    public onTagSelected(tag: TagInterface) {
        this.form.tags.unshift(tag)
        this.resetValidationMessage('tags')
    }

    public onTagRemoved(tag: TagInterface) {
        const index = this.form.tags.indexOf(tag)

        if (index === -1) {
            return
        }

        this.form.tags.splice(index, 1)
    }

    public onSubmit(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.resetValidationMessages()
        this.resetMessage()
        this.setLoading()

        if (this.isEdit) {
            this.repository.update(this.wallet.id, this.edit?.id ?? 0, this.form)
                .then(this.onUpdated)
                .catch(this.dispatchError)
                .finally(this.setLoaded)
        } else {
            this.repository.create(this.wallet.id, this.form)
                .then(this.onCreated)
                .catch(this.dispatchError)
                .finally(this.setLoaded)
        }
    }

    protected onCreated(response: AxiosResponse<LimitResponseInterface>) {
        this.$emit('created', {
            limit: response.data.data,
        })
        this.resetForm()
    }

    protected onUpdated(response: AxiosResponse<LimitResponseInterface>) {
        this.$emit('updated', {
            limit: response.data.data,
        })
        this.resetForm()
        this.loadFormFromInstance(response.data.data)
        this.triggerWalletsTagsRefresh()
    }

    public onCancel() {
        this.resetForm()
        this.$emit('cancelled')
    }

    protected resetForm() {
        this.loadFormFromInstance(this.edit)
    }

    private triggerWalletsTagsRefresh() {
        this.resetState = !this.resetState
    }
}
</script>

<style lang="scss" scoped>

</style>
