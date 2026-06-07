<script setup lang="ts">
import { reactive, shallowRef, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profile'
import { updateProfile, checkNickName, getSocial } from '@/api/profile'
import { getFeaturedCurrencies } from '@/api/currency'
import { useApiErrors } from '@/composables/useApiErrors'
import { locales } from '@/lang'
import type { Currency } from '@/api/models/currency'

import EmailFormInput from '@/components/settings/EmailFormInput.vue'

const { t } = useI18n()
const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)
const { fieldErrors, generalError, handleError, reset } = useApiErrors()

const form = reactive({
    name: '',
    lastName: '',
    nickName: '',
    defaultCurrencyCode: '',
    locale: '',
})

const currencies = shallowRef<Currency[]>([])
const loading = shallowRef(false)
const successMessage = shallowRef('')
const isNickNameValid = shallowRef<boolean | null>(null)
const isGoogleEnabled = shallowRef(false)

let nickNameTimer: ReturnType<typeof setTimeout> | null = null

const currencyOptions = computed(() =>
    currencies.value.map(c => ({ label: `${c.code} — ${c.name}`, value: c.code })),
)

const localeOptions = computed(() =>
    locales.map(l => ({ label: l.name, value: l.code as string })),
)

watch(profile, (p) => {
    if (!p) return
    form.name = p.name
    form.lastName = p.lastName ?? ''
    form.nickName = p.nickName
    form.defaultCurrencyCode = p.defaultCurrencyCode ?? ''
    form.locale = p.locale
}, { immediate: true })

watch(() => form.nickName, (nickName) => {
    isNickNameValid.value = null
    if (nickNameTimer !== null) clearTimeout(nickNameTimer)

    const trimmed = nickName.trim()
    if (!trimmed || trimmed === profile.value?.nickName) {
        clearNickNameError()
        return
    }

    nickNameTimer = setTimeout(() => validateNickName(trimmed), 1000)
})

function clearNickNameError() {
    if (!fieldErrors.value.nickName) return
    const next = { ...fieldErrors.value }
    delete next.nickName
    fieldErrors.value = next
}

onMounted(() => {
    loadCurrencies()
    loadSocial()
})

onBeforeUnmount(() => {
    if (nickNameTimer !== null) clearTimeout(nickNameTimer)
})

async function loadCurrencies() {
    try {
        currencies.value = await getFeaturedCurrencies()
    } catch {
        // non-fatal
    }
}

async function loadSocial() {
    try {
        const social = await getSocial()
        isGoogleEnabled.value = social.google
    } catch {
        // non-fatal
    }
}

async function validateNickName(nickName: string) {
    reset()
    try {
        await checkNickName(nickName)
        isNickNameValid.value = true
    } catch (error) {
        isNickNameValid.value = false
        handleError(error)
    }
}

async function onSubmit() {
    reset()
    successMessage.value = ''
    loading.value = true
    try {
        const updated = await updateProfile({
            name: form.name,
            lastName: form.lastName.trim() || null,
            nickName: form.nickName,
            defaultCurrencyCode: form.defaultCurrencyCode,
            locale: form.locale,
        })
        profileStore.setProfile(updated)
        successMessage.value = t('profileSettings.success')
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
            <h2 class="font-semibold text-lg">{{ t('profileSettings.profileSettings') }}</h2>
        </template>

        <div class="space-y-4">
            <UFormField
                :label="t('profileSettings.name')"
                :description="t('profileSettings.nameDescription')"
                :error="fieldErrors.name?.[0]"
                required
            >
                <UInput v-model="form.name" :disabled="loading" class="w-full" />
            </UFormField>

            <UFormField
                :label="t('profileSettings.lastName')"
                :error="fieldErrors.lastName?.[0]"
            >
                <UInput v-model="form.lastName" :disabled="loading" class="w-full" />
            </UFormField>

            <UFormField
                :label="t('profileSettings.nickName')"
                :description="t('profileSettings.nickNameDescription')"
                :error="fieldErrors.nickName?.[0]"
                required
            >
                <UInput v-model="form.nickName" :disabled="loading" class="w-full">
                    <template v-if="isNickNameValid" #trailing>
                        <UTooltip :text="t('profileSettings.nickNameAvailable')" :arrow="true">
                            <UIcon name="i-lucide-check" class="text-success size-5" />
                        </UTooltip>
                    </template>
                </UInput>
            </UFormField>

            <EmailFormInput />

            <UFormField
                :label="t('profileSettings.defaultCurrency')"
                :description="t('profileSettings.defaultCurrencyDescription')"
                :error="fieldErrors.defaultCurrencyCode?.[0]"
            >
                <USelect
                    v-model="form.defaultCurrencyCode"
                    :items="currencyOptions"
                    :disabled="loading"
                    class="w-full"
                />
            </UFormField>

            <UFormField
                :label="t('profileSettings.language')"
                :description="t('profileSettings.languageDescription')"
            >
                <USelect
                    v-model="form.locale"
                    :items="localeOptions"
                    :disabled="loading"
                    class="w-full"
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

            <USeparator />

            <div class="space-y-3">
                <h3 class="font-medium">{{ t('profileSettings.social') }}</h3>
                <USwitch :model-value="isGoogleEnabled" label="Google" size="lg" disabled />
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end">
                <UButton
                    :label="t('profileSettings.save')"
                    :loading="loading"
                    :disabled="!form.name || !form.nickName"
                    @click="onSubmit"
                />
            </div>
        </template>
    </UCard>
</template>
