<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { updatePassword } from '@/api/profile/password'
import { useApiErrors } from '@/composables/useApiErrors'

const { t } = useI18n()
const { fieldErrors, generalError, handleError, reset } = useApiErrors()

const form = reactive({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirmation: '',
})

const loading = shallowRef(false)
const successMessage = shallowRef('')

function resetForm() {
    form.currentPassword = ''
    form.newPassword = ''
    form.newPasswordConfirmation = ''
}

async function onSubmit() {
    reset()
    successMessage.value = ''

    if (form.newPassword !== form.newPasswordConfirmation) {
        fieldErrors.value = { newPasswordConfirmation: [t('securitySettings.newPasswordConfirmationDescription')] }
        return
    }

    loading.value = true
    try {
        await updatePassword({
            currentPassword: form.currentPassword,
            newPassword: form.newPassword,
            newPasswordConfirmation: form.newPasswordConfirmation,
        })
        successMessage.value = t('securitySettings.success')
        resetForm()
    } catch (error) {
        handleError(error)
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <UCard>
        <template #header>
            <h2 class="font-semibold text-lg">{{ t('securitySettings.changePassword') }}</h2>
        </template>

        <div class="space-y-4">
            <UFormField
                :label="t('securitySettings.currentPassword')"
                :error="fieldErrors.currentPassword?.[0]"
                required
            >
                <UInput
                    v-model="form.currentPassword"
                    type="password"
                    :disabled="loading"
                    class="w-full"
                    @change="reset()"
                />
            </UFormField>

            <UFormField
                :label="t('securitySettings.newPassword')"
                :description="t('securitySettings.newPasswordDescription')"
                :error="fieldErrors.newPassword?.[0]"
                required
            >
                <UInput
                    v-model="form.newPassword"
                    type="password"
                    :disabled="loading"
                    class="w-full"
                    @change="reset()"
                />
            </UFormField>

            <UFormField
                :label="t('securitySettings.newPasswordConfirmation')"
                :description="t('securitySettings.newPasswordConfirmationDescription')"
                :error="fieldErrors.newPasswordConfirmation?.[0]"
                required
            >
                <UInput
                    v-model="form.newPasswordConfirmation"
                    type="password"
                    :disabled="loading"
                    class="w-full"
                    @change="reset()"
                />
            </UFormField>

            <UAlert
                v-if="generalError"
                color="error"
                :description="generalError"
                icon="i-lucide-alert-circle"
            />

            <UAlert
                v-if="successMessage"
                color="success"
                :description="successMessage"
                icon="i-lucide-check-circle"
                close
                @update:open="successMessage = ''"
            />
        </div>

        <template #footer>
            <div class="flex justify-end">
                <UButton
                    :label="t('securitySettings.updatePassword')"
                    :loading="loading"
                    :disabled="!form.currentPassword || !form.newPassword || !form.newPasswordConfirmation"
                    @click="onSubmit"
                />
            </div>
        </template>
    </UCard>
</template>
