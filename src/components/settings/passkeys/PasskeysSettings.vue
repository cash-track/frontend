<template>
    <div>
        <b-form-group
            v-if="passkeysSupported"
            label-align-lg="right"
            label-cols-lg="4"
            label-for="key_name"
            :invalid-feedback="validationMessage('name')"
            :state="validationState('name')"
            :description="$t('passkeySettings.keyNameDescription')"
        >
            <template v-slot:label>{{ $t('passkeySettings.keyName') }}</template>
            <b-input-group>
                <b-form-input
                    id="key_name"
                    v-model="form.name"
                    required
                    type="text"
                    :disabled="isLoadingFor(actionAdd)"
                    :state="validationState('name')"
                    @change="resetValidationMessage('name')"
                >
                </b-form-input>
                <b-input-group-append>
                    <b-button
                        variant="primary"
                        :disabled="isLoadingFor(actionAdd)"
                        v-if="passkeysSupported"
                        @click="onAddPassKey">
                        {{ $t('passkeySettings.addPasskey') }}
                        <b-spinner v-show="isLoadingFor(actionAdd)" small></b-spinner>
                    </b-button>
                </b-input-group-append>
            </b-input-group>
        </b-form-group>

        <b-form-group label-align-lg="right" label-cols-lg="4">
            <h6>
                {{ $t('passkeySettings.yourPasskeys') }}
                <b-spinner v-show="isLoading" small></b-spinner>
            </h6>
        </b-form-group>

        <div class="passkeys-list mb-4">
            <warning-message :message="getMessage()" :show="hasMessage"></warning-message>

            <passkey-item v-for="key of keys" :passkey="key" :key="key.id" @deleted="load"></passkey-item>
        </div>

        <b-alert fade show v-if="passkeysSupported">
            {{ $t('passkeySettings.featureSupports') }}
            <a href="https://www.passkeys.com/">
                {{ $t('passkeySettings.featureSupportsPasskeys') }}
                <b-icon-box-arrow-up-right></b-icon-box-arrow-up-right>
            </a>
            {{ $t('passkeySettings.featureSupportsIdentity') }}.
            {{ $t('passkeySettings.featureSupportsInfo') }}
        </b-alert>

        <b-alert fade show v-if="!passkeysSupported">
            {{ $t('passkeySettings.infoNotSupported') }}
            {{ $t('passkeySettings.infoNotSupportedSee') }}
            <a href="https://passkeys.dev/device-support/">
                {{ $t('passkeySettings.infoNotSupportedDeviceSupport') }}
                <b-icon-box-arrow-up-right></b-icon-box-arrow-up-right>
            </a>
            {{ $t('passkeySettings.infoNotSupportedMoreInfo') }}.
        </b-alert>
    </div>
</template>

<script lang="ts">
import { Mixins, Component } from 'vue-property-decorator'
import { browserSupportsWebAuthn, startRegistration, WebAuthnError } from '@simplewebauthn/browser';
import Loader from '@/shared/Loader';
import Messager from '@/shared/Messager';
import Validator from '@/shared/Validator';
import { passkeyInit, PasskeyInterface, passkeysGet, passkeyStore } from '@/api/profile/passkeys';
import PasskeyItem from '@/components/settings/passkeys/PasskeyItem.vue';
import WarningMessage from '@/components/shared/WarningMessage.vue';

const ACTION_ADD = 'add'

@Component({
    components: {WarningMessage, PasskeyItem}
})
export default class PasskeysSecuritySettings extends Mixins(Loader, Messager, Validator) {
    // eslint-disable-next-line @typescript-eslint/ban-types
    unsubscribeFromStore: Function|null = null

    passkeysSupported = false

    form = {
        name: ''
    }

    keys: Array<PasskeyInterface> = []

    clientExceptionCounter = 2

    mounted() {
        if (this.$store.state.isLogged) {
            this.initPassKey()
        } else {
            this.unsubscribeFromStore = this.$store.subscribe(this.initPassKey)
        }

        this.load()
    }

    get actionAdd(): string {
        return ACTION_ADD
    }

    protected initPassKey() {
        if (typeof this.unsubscribeFromStore === 'function') {
            this.unsubscribeFromStore()
        }

        this.passkeysSupported = browserSupportsWebAuthn()

        console.info("Passkeys supported: ", this.passkeysSupported)
    }

    public async load() {
        this.setLoading();

        try {
            const response = await passkeysGet()
            this.keys = response.data.data
        } catch (exception) {
            this.dispatchException(exception)
        }

        this.setLoaded();
    }

    public async onAddPassKey() {
        this.setLoadingFor(ACTION_ADD);
        this.resetMessage()
        this.resetValidationMessages()

        try {
            const init = await passkeyInit({
                name: this.form.name,
            })

            console.info('Creating passkey using request data', init.data)

            const keyCredentials = await startRegistration(init.data.dataDecoded)

            console.info('Passkey created on the device', keyCredentials.id)

            const storeResponse = await passkeyStore({
                challenge: init.data.challenge,
                data: keyCredentials,
            })

            console.info('Passkey stored on the backend', storeResponse.data)

            this.keys.push(storeResponse.data.data)

            this.form.name = ''
        } catch (exception) {
            if (exception instanceof WebAuthnError) {
                this.onWebAuthnError(exception)
            } else {
                this.dispatchException(exception)
            }
        }

        this.setLoadedFor(ACTION_ADD)
    }

    protected onWebAuthnError(error: WebAuthnError) {
        if (this.clientExceptionCounter === 0) {
            console.error(error)
            this.setMessage(this.$t('passkeySettings.addClientErrorAgain').toString())
            return
        }

        this.clientExceptionCounter--
        this.setMessage(this.$t('passkeySettings.addClientError').toString())
    }


}
</script>

<style scoped>

</style>
