<script setup lang="ts">
import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()

const open = shallowRef(true)
</script>

<template>
    <UAlert
        v-if="!auth.isEmailConfirmed && open"
        v-model:open="open"
        color="info"
        variant="soft"
        :title="t('profile.emailNotConfirmed')"
        :close="true"
        class="mb-4"
    >
        <template #description>
            <p class="mb-2">{{ t('profile.emailNotConfirmedMainMessage') }}</p>
            <p class="mb-3">{{ t('profile.emailNotConfirmedResendMessage') }}</p>
            <UButton
                size="md"
                color="info"
                variant="soft"
                :label="t('profileSettings.profileSettings')"
                :to="{ name: 'settings' }"
            />
        </template>
    </UAlert>
</template>
