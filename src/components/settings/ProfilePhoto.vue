<script setup lang="ts">
import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profile'
import { uploadPhoto } from '@/api/profile'
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue'

const { t } = useI18n()
const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)

const selectedFile = shallowRef<File | null>(null)
const loading = shallowRef(false)
const successMessage = shallowRef('')
const errorMessage = shallowRef('')

async function onUpload() {
    if (!selectedFile.value) return
    loading.value = true
    successMessage.value = ''
    errorMessage.value = ''
    try {
        const res = await uploadPhoto(selectedFile.value)
        profileStore.updatePhotoUrl(res.url)
        selectedFile.value = null
        successMessage.value = t('profilePhoto.success')
    } catch {
        errorMessage.value = t('unknownError')
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <UCard>
        <template #header>
            <h2 class="font-semibold text-lg">{{ t('profilePhoto.photo') }}</h2>
        </template>

        <div class="space-y-4">
            <div v-if="profile" class="flex items-center gap-4">
                <ProfileAvatar :user="profile" />
                <p class="text-sm font-medium">{{ t('profilePhoto.currentPhoto') }}</p>
            </div>

            <UFileUpload
                v-model="selectedFile"
                accept="image/*"
                variant="area"
                layout="list"
                :label="t('profilePhoto.labelPlaceholder')"
                :description="t('profilePhoto.labelDescription')"
                :disabled="loading"
                class="w-full"
            />

            <UAlert
                v-if="errorMessage"
                color="error"
                :description="errorMessage"
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
                    :label="t('profilePhoto.save')"
                    :loading="loading"
                    :disabled="!selectedFile"
                    @click="onUpload"
                />
            </div>
        </template>
    </UCard>
</template>
