<script setup lang="ts">
import { shallowRef, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { browserSupportsWebAuthn, startRegistration, WebAuthnError } from '@simplewebauthn/browser'
import type { Passkey } from '@/api/models/passkey'
import { getPasskeys, initPasskey, storePasskey } from '@/api/profile/passkeys'
import PasskeyItem from './PasskeyItem.vue'
import LoadErrorAlert from '@/components/Shared/LoadErrorAlert.vue'

const { t } = useI18n()

const passkeys = shallowRef<Passkey[]>([])
const passkeysSupported = shallowRef(false)
const loading = shallowRef(false)
const failed = shallowRef(false)
const lastError = shallowRef<unknown>(null)
const addLoading = shallowRef(false)
const keyName = shallowRef('')
const addError = shallowRef<string | null>(null)
let clientExceptionCounter = 2

onMounted(async () => {
    passkeysSupported.value = browserSupportsWebAuthn()
    await loadPasskeys()
})

async function loadPasskeys() {
    loading.value = true
    failed.value = false
    lastError.value = null
    try {
        passkeys.value = await getPasskeys()
    } catch (err) {
        failed.value = true
        lastError.value = err
    } finally {
        loading.value = false
    }
}

async function onAddPasskey() {
    if (!keyName.value.trim()) return

    addLoading.value = true
    addError.value = null

    try {
        const init = await initPasskey(keyName.value.trim())
        const options = JSON.parse(atob(init.data))
        const credentials = await startRegistration({ optionsJSON: options })
        const stored = await storePasskey({ challenge: init.challenge, data: credentials })
        passkeys.value = [...passkeys.value, stored]
        keyName.value = ''
    } catch (error) {
        if (error instanceof WebAuthnError) {
            if (clientExceptionCounter === 0) {
                addError.value = t('passkeySettings.addClientErrorAgain')
            } else {
                clientExceptionCounter--
                addError.value = t('passkeySettings.addClientError')
            }
        } else {
            addError.value = t('passkeySettings.addClientError')
        }
    } finally {
        addLoading.value = false
    }
}

function onPasskeyDeleted(id: number) {
    passkeys.value = passkeys.value.filter(p => p.id !== id)
}
</script>

<template>
    <div class="space-y-4">
        <div v-if="passkeysSupported" class="flex gap-2">
            <UInput
                v-model="keyName"
                :placeholder="t('passkeySettings.keyName')"
                :disabled="addLoading"
                class="flex-1"
            />
            <UButton
                :label="t('passkeySettings.addPasskey')"
                :loading="addLoading"
                :disabled="!keyName.trim()"
                @click="onAddPasskey"
            />
        </div>

        <UAlert
            v-if="addError"
            color="error"
            :description="addError"
            icon="i-lucide-alert-circle"
        />

        <div v-if="loading" class="flex justify-center py-4">
            <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
        </div>

        <LoadErrorAlert
            v-else-if="failed"
            :title="t('passkeySettings.loadingError')"
            :error="lastError"
            retryable
            @retry="loadPasskeys()"
        />

        <div v-else-if="passkeys.length === 0" class="text-sm text-muted py-2">
            {{ t('passkeySettings.yourPasskeys') }}: —
        </div>

        <div v-else>
            <PasskeyItem
                v-for="pk in passkeys"
                :key="pk.id"
                :passkey="pk"
                @deleted="onPasskeyDeleted(pk.id)"
            />
        </div>

        <UAlert
            v-if="passkeysSupported"
            color="info"
            variant="subtle"
            icon="i-lucide-info"
        >
            <template #description>
                {{ t('passkeySettings.featureSupports') }}
                <a href="https://www.passkeys.com/" class="underline" target="_blank" rel="noopener">
                    {{ t('passkeySettings.featureSupportsPasskeys') }}
                </a>
                {{ t('passkeySettings.featureSupportsIdentity') }}
                {{ t('passkeySettings.featureSupportsInfo') }}
            </template>
        </UAlert>

        <UAlert
            v-else
            color="warning"
            icon="i-lucide-triangle-alert"
        >
            <template #description>
                {{ t('passkeySettings.infoNotSupported') }}
                {{ t('passkeySettings.infoNotSupportedSee') }}
                <a href="https://passkeys.dev/device-support/" class="underline" target="_blank" rel="noopener">
                    {{ t('passkeySettings.infoNotSupportedDeviceSupport') }}
                </a>
                {{ t('passkeySettings.infoNotSupportedMoreInfo') }}.
            </template>
        </UAlert>
    </div>
</template>
