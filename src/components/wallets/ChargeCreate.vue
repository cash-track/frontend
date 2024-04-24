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
                                :validation-state="validationState(['tags'])"
                                :validation-message="validationMessage(['tags'])"
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
                <b-button variant="primary" type="submit" class="mr-1" :disabled="!isEmailConfirmed || isLoading">
                    {{ $t('charges.create') }}
                    <b-spinner v-show="isLoading" small></b-spinner>
                </b-button>
                <b-button variant="secondary" v-b-toggle.charge-create :disabled="isLoading">
                    {{ $t('charges.cancel') }}
                </b-button>
            </b-col>
        </b-row>
    </b-form>
</template>

<script lang="ts">
import { Mixins, Component, Prop, Watch } from 'vue-property-decorator'
import { AxiosResponse } from 'axios';
import moment from 'moment/moment';
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
import ChargeTitleFormInput from '@/components/wallets/charges/ChargeTitleFormInput.vue';

export interface ChargeCreatedEvent {
    charge: ChargeInterface;
}

const DATE_FORMAT = 'YYYY-MM-DD'
const TIME_FORMAT = 'HH:mm:ss'
const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'
const PARENT_COLLAPSE_ID = 'charge-create'

@Component({
    components: {WarningMessage, Tag, CreateTag, TagFormInput, ChargeTitleFormInput}
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
        dateTime: '',
    }

    formDate = ''
    formTime = ''

    isDescriptionEnabled = false
    isDateTimeEnabled = false

    resetState = false

    mounted() {
        this.onFormDisplayed()
        this.$root.$on('bv::collapse::state', (collapseId: string, isJustShown: boolean) => {
            if (isJustShown && collapseId === PARENT_COLLAPSE_ID) {
                this.onFormDisplayed()
            }
        })

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

    protected setFormDateTime(dateTime?: string) {
        const date = moment(dateTime)
        this.formDate = date.format(DATE_FORMAT)
        this.formTime = date.format(TIME_FORMAT)
    }

    @Watch('formDate')
    @Watch('formTime')
    protected updateFormDateTime() {
        this.form.dateTime = moment(`${this.formDate} ${this.formTime}`).utc().format(DATETIME_FORMAT)
    }

    protected onFormDisplayed() {
        this.setFormDateTime()
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
            dateTime: '',
        }

        this.setFormDateTime()
        this.isDescriptionEnabled = false
        this.isDateTimeEnabled = false
        this.resetState = !this.resetState
    }
}
</script>

<style lang="scss" scoped>

</style>
