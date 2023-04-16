<template>
    <b-form-group
        label-align-lg="right"
        label-cols-lg="4"
        label-for="lastName"
        :state="isConfirmed"
    >
        <template v-slot:label>{{ $t('emailFormInput.label') }}</template>
        <template v-slot:invalid-feedback>
            {{ $t('emailFormInput.labelDescription') }}<br>
            <span v-show="!isAlreadySent">
                <b-link @click.prevent="onResend" :disabled="isLoading">{{ $t('emailFormInput.resend') }}</b-link>
                <b-spinner v-show="isLoading" small></b-spinner>
                {{ $t('emailFormInput.confirmationMessage') }}
            </span>
            <span v-show="isAlreadySent">{{ $t('emailFormInput.confirmationMessageSent', [resendUnlockIn]) }}</span>
            <span v-if="hasMessage">{{ message }}</span>
        </template>
        <template v-slot:valid-feedback>
            {{ $t('emailFormInput.confirmed') }}
        </template>
        <b-form-input
            id="email"
            v-model="email"
            required
            disabled
            type="text"
            :state="isConfirmed"
        ></b-form-input>
    </b-form-group>
</template>

<script lang="ts">
import { Mixins, Component } from 'vue-property-decorator';
import Loader from '@/shared/Loader';
import Messager from '@/shared/Messager';
import Validator from '@/shared/Validator';
import {
    EmailConfirmationInterface, EmailConfirmationResponseInterface,
    profileGetEmailConfirmation,
    profileResendEmailConfirmation
} from '@/api/profile/email';
import { AxiosResponse } from 'axios';
import { ErrorResponseInterface } from '@/api/responses';
import { MutationPayload } from 'vuex';

@Component
export default class EmailFormInput extends Mixins(Loader, Messager, Validator) {
    unsubscribeFromStore: Function|null = null

    emailConfirmation: EmailConfirmationInterface|null = null

    isAlreadySent = false;

    resendTimeLimit = 60;

    resendUnlockIn = 60;

    get email() {
        return this.$store.state.profile.email
    }

    get isConfirmed() {
        return this.$store.state.isEmailConfirmed
    }

    mounted() {
        this.load()

        if (this.$store.state.isLogged) {
            this.load()
        } else {
            this.unsubscribeFromStore = this.$store.subscribe(this.onProfileLoaded)
        }
    }

    protected onProfileLoaded(mutation: MutationPayload) {
        if (mutation.type !== 'login') {
            return
        }

        if (this.isConfirmed) {
            return
        }

        this.load()
    }

    protected load() {
        if (typeof this.unsubscribeFromStore === 'function') {
            this.unsubscribeFromStore()
        }

        profileGetEmailConfirmation().then(this.onLoadedSuccess).catch(this.dispatchError);
    }

    protected onLoadedSuccess(res: AxiosResponse<EmailConfirmationResponseInterface>) {
        this.emailConfirmation = res.data.data;
        this.resendTimeLimit = res.data.data.resendTimeLimit;

        if (res.data.data.timeSentAgo <= this.resendTimeLimit) {
            this.resendUnlockIn = this.resendTimeLimit - res.data.data.timeSentAgo;
        } else {
            this.resendUnlockIn = this.resendTimeLimit;
        }

        if (this.emailConfirmation.isThrottled) {
            this.isAlreadySent = true;
            this.queueSentStatusClear();
        }
    }

    protected onResend(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.setLoading();

        profileResendEmailConfirmation()
            .then(this.onSuccess)
            .catch(this.dispatchError)
            .finally(this.setLoaded);
    }

    protected onSuccess() {
        this.isAlreadySent = true;
        this.queueSentStatusClear();
    }

    protected queueSentStatusClear() {
        setTimeout(() => {
            this.resetMessage();
            this.isAlreadySent = false;
        }, 1000 * this.resendUnlockIn);
    }

    protected onBadRequestResponse(response: ErrorResponseInterface) {
        let message = response.message;

        if (response.error !== undefined) {
            message += ' ' + response.error;
        }

        this.setMessage(message);
        this.isAlreadySent = true;
    }
}
</script>

<style lang="scss" scoped>

</style>
