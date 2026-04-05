<script setup lang="ts">
import { shallowRef, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profile'
import { getEmailConfirmation, resendEmailConfirmation } from '@/api/profile/email'
import { useNotifications } from '@/composables/useNotifications'
import type { EmailConfirmation } from '@/api/profile/email'

const { t } = useI18n()
const { profile } = storeToRefs(useProfileStore())
const { notifySuccess, notifyError } = useNotifications()

const confirmation = shallowRef<EmailConfirmation | null>(null)
const resending = shallowRef(false)

onMounted(async () => {
    try {
        confirmation.value = await getEmailConfirmation()
    } catch {
        // non-fatal — email may already be confirmed or request fails silently
    }
})

async function onResend() {
    resending.value = true
    try {
        await resendEmailConfirmation()
        confirmation.value = await getEmailConfirmation()
        notifySuccess(t('emailFormInput.confirmationMessageSent', [confirmation.value?.resendTimeLimit ?? 0]))
    } catch {
        notifyError(t('unknownError'))
    } finally {
        resending.value = false
    }
}
</script>

<template>
    <UCard>
        <template #header>
            <h2 class="font-semibold text-lg">{{ t('emailFormInput.label') }}</h2>
        </template>

        <div class="space-y-4">
            <UFormField
                :label="t('emailFormInput.label')"
                :description="t('emailFormInput.labelDescription')"
            >
                <UInput :model-value="profile?.email" disabled class="w-full" />
            </UFormField>

            <UAlert
                v-if="confirmation?.isValid"
                color="success"
                :description="t('emailFormInput.confirmed')"
                icon="i-lucide-check-circle"
            />

            <div v-else-if="confirmation" class="flex flex-wrap items-center gap-3">
                <UButton
                    variant="outline"
                    size="sm"
                    :label="t('emailFormInput.resend')"
                    :loading="resending"
                    :disabled="confirmation.isThrottled || resending"
                    @click="onResend"
                />
                <span v-if="confirmation.isThrottled" class="text-sm text-muted">
                    {{ t('emailFormInput.confirmationMessageSent', [confirmation.resendTimeLimit - confirmation.timeSentAgo]) }}
                </span>
            </div>
        </div>
    </UCard>
</template>
