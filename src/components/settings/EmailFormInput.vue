<script setup lang="ts">
import { shallowRef, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { AxiosError } from 'axios'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profile'
import { getEmailConfirmation, resendEmailConfirmation } from '@/api/profile/email'
import { ApiError } from '@/api/models/error'
import type { EmailConfirmation } from '@/api/profile/email'

const { t } = useI18n()
const { profile } = storeToRefs(useProfileStore())

const confirmation = shallowRef<EmailConfirmation | null>(null)
const resending = shallowRef(false)
const isAlreadySent = shallowRef(false)
const remainingSeconds = shallowRef(0)
const serverErrorMessage = shallowRef<string | null>(null)

let countdownTimer: ReturnType<typeof setInterval> | null = null

const isConfirmed = computed(() => profile.value?.isEmailConfirmed === true)
const showError = computed(() => !isConfirmed.value && confirmation.value !== null)

function clearCountdown() {
    if (countdownTimer !== null) {
        clearInterval(countdownTimer)
        countdownTimer = null
    }
}

function startCountdown(seconds: number) {
    clearCountdown()
    if (seconds <= 0) {
        isAlreadySent.value = false
        remainingSeconds.value = 0
        return
    }
    isAlreadySent.value = true
    remainingSeconds.value = seconds
    countdownTimer = setInterval(() => {
        remainingSeconds.value -= 1
        if (remainingSeconds.value <= 0) {
            clearCountdown()
            isAlreadySent.value = false
            serverErrorMessage.value = null
        }
    }, 1000)
}

onMounted(async () => {
    if (isConfirmed.value) return
    try {
        const data = await getEmailConfirmation()
        confirmation.value = data
        if (data.isThrottled) {
            const remaining = Math.max(data.resendTimeLimit - data.timeSentAgo, 0)
            startCountdown(remaining)
        }
    } catch {
        // non-fatal — leave neutral state
    }
})

onBeforeUnmount(clearCountdown)

async function onResend() {
    resending.value = true
    serverErrorMessage.value = null
    try {
        await resendEmailConfirmation()
        const data = await getEmailConfirmation()
        confirmation.value = data
        startCountdown(Math.max(data.resendTimeLimit, 0))
    } catch (error) {
        serverErrorMessage.value = resolveErrorMessage(error)
        isAlreadySent.value = true
    } finally {
        resending.value = false
    }
}

function resolveErrorMessage(error: unknown): string {
    if (error instanceof AxiosError && error.response?.data) {
        try {
            const apiError = ApiError.from(error.response.data)
            return apiError.error ? `${apiError.message} ${apiError.error}` : apiError.message
        } catch {
            // fall through
        }
    }
    return t('unknownError')
}
</script>

<template>
    <UFormField
        :label="t('emailFormInput.label')"
        :error="showError ? ' ' : undefined"
        :ui="{ trailing: 'pe-1' }"
    >
        <UInput :model-value="profile?.email" disabled class="w-full">
            <template v-if="isConfirmed" #trailing>
                <UTooltip :text="t('emailFormInput.confirmed')" :arrow="true">
                    <UIcon name="i-lucide-check" class="text-success size-5" />
                </UTooltip>
            </template>
        </UInput>

        <template #error v-if="!isConfirmed">
            <div class="space-y-1">
                <div>{{ t('emailFormInput.labelDescription') }}</div>
                <div v-if="serverErrorMessage">{{ serverErrorMessage }}</div>
                <div v-else-if="isAlreadySent">
                    {{ t('emailFormInput.confirmationMessageSent', [remainingSeconds]) }}
                </div>
                <div v-else class="flex flex-wrap items-center gap-1">
                    <UButton
                        variant="soft"
                        size="md"
                        color="error"
                        :loading="resending"
                        :disabled="resending"
                        :label="t('emailFormInput.resend')"
                        @click="onResend"
                    />
                    <span>{{ t('emailFormInput.confirmationMessage') }}</span>
                </div>
            </div>
        </template>

        <template v-if="isConfirmed" #help>
            <span class="text-success">{{ t('emailFormInput.confirmed') }}</span>
        </template>
    </UFormField>
</template>
