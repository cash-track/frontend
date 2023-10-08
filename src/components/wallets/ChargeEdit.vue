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
                                 :placeholder="$t('charges.amount')"
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
            <b-col md="12" v-show="!isDescriptionEnabled && !hasValidationMessage('description')">
                <b-form-group>
                    <b-link href="#" @click="isDescriptionEnabled = true">{{ $t('charges.changeDescription') }}</b-link>
                </b-form-group>
            </b-col>
            <b-col md="12" v-if="isDescriptionEnabled || hasValidationMessage('description')">
                <b-form-group
                    label-for="description"
                    :invalid-feedback="validationMessage('description')"
                    :state="validationState('description')"
                >
                    <b-textarea
                        id="description"
                        v-model="form.description"
                        :disabled="isLoading"
                        :placeholder="$t('charges.description')"
                        :state="validationState('description')"
                        @change="resetValidationMessage('description')"
                    ></b-textarea>
                </b-form-group>
            </b-col>
            <b-col md="12" v-show="!isDateTimeEnabled && !hasValidationMessage('dateTime')">
                <b-form-group>
                    <b-link href="#" @click="isDateTimeEnabled = true">{{ $t('charges.changeDate') }}</b-link>
                </b-form-group>
            </b-col>
            <b-col md="8" v-show="isDateTimeEnabled || hasValidationMessage('dateTime')">
                <b-form-group
                    label-for="dateTime"
                    :invalid-feedback="validationMessage('dateTime')"
                    :state="validationState('dateTime')"
                >
                    <b-form-datepicker v-model="formDate"
                                       :locale="locale"
                                       :max="new Date()"
                                       :disabled="isLoading"
                                       :date-format-options="dateFormatOptions"
                                       :state="validationState('dateTime')"
                                       @change="resetValidationMessage('dateTime')"
                    ></b-form-datepicker>
                </b-form-group>
            </b-col>
            <b-col md="4" v-show="isDateTimeEnabled || hasValidationMessage('dateTime')">
                <b-form-group
                    label-for="time"
                    :state="validationState('dateTime')"
                >
                    <b-form-timepicker no-close-button
                                       v-model="formTime"
                                       :locale="locale"
                                       :disabled="isLoading"
                                       :state="validationState('dateTime')"
                                       @change="resetValidationMessage('dateTime')"
                    ></b-form-timepicker>
                </b-form-group>
            </b-col>
            <b-col md="12">
                <warning-message :message="message" :show="hasMessage"></warning-message>
            </b-col>
            <b-col md="12">
                <b-button variant="primary" type="submit" class="mr-1" :disabled="isLoading">
                    {{ $t('charges.update') }}
                    <b-spinner v-show="isLoading" small></b-spinner>
                </b-button>
                <b-button variant="secondary" :disabled="isLoading" @click="onCancelled">
                    {{ $t('charges.cancel') }}
                </b-button>
            </b-col>
        </b-row>
    </b-form>
</template>

<script lang="ts">
import { Mixins, Component, Prop, Watch } from 'vue-property-decorator'
import { AxiosResponse } from 'axios';
import moment from 'moment';
import Loader from '@/shared/Loader';
import Messager from '@/shared/Messager';
import Validator from '@/shared/Validator';
import { WalletInterface } from '@/api/wallets';
import {
    walletChargeUpdate,
    TypeIncome,
    TypeExpense,
    ChargeResponseInterface,
    ChargeInterface, ChargeUpdateRequestInterface
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

const DATE_FORMAT = 'YYYY-MM-DD'
const TIME_FORMAT = 'HH:mm:ss'
const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

@Component({
    components: {WarningMessage, Tag, TagFormInput, ChargeTitleFormInput}
})
export default class ChargeEdit extends Mixins(Loader, Messager, Validator) {
    @Prop()
    wallet!: WalletInterface

    @Prop()
    charge!: ChargeInterface

    form: ChargeUpdateRequestInterface = {
        type: TypeExpense,
        amount: null,
        title: '',
        description: '',
        tags: [],
        dateTime: '',
    }

    formDate = ''
    formTime = ''

    isDescriptionEnabled = false
    isDateTimeEnabled = false

    resetState = false

    mounted() {
        this.setForm(this.charge)
    }

    protected setForm(charge: ChargeInterface) {
        this.form = {
            type: charge.operation,
            amount: charge.amount,
            title: charge.title,
            description: charge.description,
            tags: charge.tags,
            dateTime: charge.dateTime,
        }
        this.setFormDateTime(charge.dateTime)
    }

    protected setFormDateTime(dateTime: string) {
        const date = moment(dateTime)
        this.formDate = date.format(DATE_FORMAT)
        this.formTime = date.format(TIME_FORMAT)
    }

    get isTypeIncome(): boolean {
        return this.form.type === TypeIncome
    }

    get isTypeExpense(): boolean {
        return this.form.type === TypeExpense
    }

    get locale() {
        return this.$store.state.locale
    }

    get dateFormatOptions() {
        return {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        }
    }

    @Watch('formDate')
    @Watch('formTime')
    protected updateFormDateTime() {
        this.form.dateTime = moment(`${this.formDate} ${this.formTime}`).utc().format(DATETIME_FORMAT)
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
        this.setForm(response.data.data)
        this.isDescriptionEnabled = false
        this.isDateTimeEnabled = false
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
