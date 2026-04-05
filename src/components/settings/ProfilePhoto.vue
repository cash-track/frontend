<script setup lang="ts">
import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profile'
import { uploadPhoto } from '@/api/profile'
import { useNotifications } from '@/composables/useNotifications'
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue'

const { t } = useI18n()
const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)
const { notifySuccess, notifyError } = useNotifications()

const selectedFile = shallowRef<File | null>(null)
const loading = shallowRef(false)

function onFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    selectedFile.value = input.files?.[0] ?? null
}

async function onUpload() {
    if (!selectedFile.value) return
    loading.value = true
    try {
        const res = await uploadPhoto(selectedFile.value)
        profileStore.updatePhotoUrl(res.url)
        selectedFile.value = null
        notifySuccess(t('profilePhoto.save'))
    } catch {
        notifyError(t('unknownError'))
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
                <div>
                    <p class="text-sm font-medium">{{ t('profilePhoto.currentPhoto') }}</p>
                    <p class="text-sm text-muted">{{ t('profilePhoto.currentPhotoDescription') }}</p>
                </div>
            </div>

            <UFormField
                :label="t('profilePhoto.label')"
                :description="t('profilePhoto.labelDescription')"
            >
                <input
                    type="file"
                    accept="image/*"
                    :disabled="loading"
                    class="block w-full text-sm"
                    @change="onFileChange"
                />
            </UFormField>

            <p v-if="selectedFile" class="text-sm text-muted">
                {{ t('profilePhoto.selectedFile') }} {{ selectedFile.name }}
            </p>
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
