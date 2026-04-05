<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { resendEmailConfirmation } from '@/api/profile/email'
import { useNotifications } from '@/composables/useNotifications'

const { t } = useI18n()
const auth = useAuthStore()
const { notifySuccess, notifyError } = useNotifications()

const resending = ref(false)

async function onResend() {
    resending.value = true
    try {
        await resendEmailConfirmation()
        notifySuccess(t('emailFormInput.confirmationMessage'))
    } catch {
        notifyError(t('unknownError'))
    } finally {
        resending.value = false
    }
}
</script>

<template>
    <UAlert
        v-if="!auth.isEmailConfirmed"
        color="warning"
        variant="subtle"
        :title="t('profile.emailNotConfirmed')"
        :description="t('profile.emailNotConfirmedMainMessage')"
        class="mb-4"
    >
        <template #description>
            <p class="mb-2">{{ t('profile.emailNotConfirmedMainMessage') }}</p>
            <p class="mb-3">{{ t('profile.emailNotConfirmedResendMessage') }}</p>
            <UButton
                size="sm"
                color="warning"
                variant="outline"
                :label="t('emailFormInput.resend')"
                :loading="resending"
                @click="onResend"
            />
        </template>
    </UAlert>
</template>
