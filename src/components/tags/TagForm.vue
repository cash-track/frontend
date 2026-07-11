<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { createTag, updateTag } from '@/api/tags'
import type { Tag } from '@/api/models/tag'
import { useApiErrors } from '@/composables/useApiErrors'
import { parseTagInput } from '@/shared/strings'
import TagChip from './Tag.vue'
import LoadErrorAlert from '@/components/Shared/LoadErrorAlert.vue'

const props = defineProps<{
    tag?: Tag | null
}>()

const emit = defineEmits<{
    'tag-created': [tag: Tag]
    'tag-updated': [tag: Tag]
}>()

const { t } = useI18n()
const { fieldErrors, generalError, generalErrorRaw, reset: resetErrors, handleError } = useApiErrors([
    'name',
    'icon',
])

const nameInput = ref('')
const color = ref('#6366f1')
const loading = ref(false)

const isEditMode = computed(() => !!props.tag)

const parsed = computed(() => parseTagInput(nameInput.value))

const previewTag = computed(() => ({
    id: 0,
    name: parsed.value.name || t('tags.inputLabel'),
    icon: parsed.value.icon,
    color: color.value || null,
    userId: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
}))

function populateFromTag(tag: Tag | null | undefined) {
    if (!tag) {
        nameInput.value = ''
        color.value = '#6366f1'
        return
    }
    nameInput.value = tag.icon ? `${tag.icon} ${tag.name}` : tag.name
    color.value = tag.color ?? '#6366f1'
}

watch(() => props.tag, populateFromTag, { immediate: true })

const validationError = computed(() => {
    if (!nameInput.value.trim()) return null
    const { name } = parsed.value
    if (!name) return t('tags.nameRequired')
    if (name.length < 3) return t('tags.nameTooShort')
    if (/\s/.test(name)) return t('tags.nameNoSpaces')
    return null
})

function validate(): boolean {
    const { name } = parsed.value
    if (!name) return false
    if (name.length < 3) return false
    if (/\s/.test(name)) return false
    return true
}

async function onSubmit() {
    resetErrors()

    const { name, icon } = parsed.value

    if (!name || name.length < 3 || /\s/.test(name)) {
        return
    }

    const request = { name, icon, color: color.value || null }

    loading.value = true
    try {
        if (isEditMode.value && props.tag) {
            const updated = await updateTag(props.tag.id, request)
            emit('tag-updated', updated)
        } else {
            const created = await createTag(request)
            emit('tag-created', created)
            nameInput.value = ''
            color.value = '#6366f1'
        }
    } catch (err) {
        handleError(err)
    } finally {
        loading.value = false
    }
}

defineExpose({ validationError })
</script>

<template>
    <div class="space-y-4">
        <!-- Preview -->
        <div class="flex items-center gap-2">
            <span class="text-sm text-muted">{{ t('tags.preview') }}:</span>
            <TagChip :tag="previewTag" />
        </div>

        <form novalidate @submit.prevent="onSubmit">
            <div class="flex w-full -space-x-px sm:items-start">
                <!-- Name + emoji field with inline color picker -->
                <UFormField
                    class="flex-1 min-w-0"
                    :error="validationError ?? fieldErrors.name?.[0] ?? fieldErrors.icon?.[0]"
                >
                    <UInput
                        v-model="nameInput"
                        required
                        type="text"
                        :placeholder="t('tags.inputLabel')"
                        autocomplete="off"
                        :disabled="loading"
                        :status="(validationError || fieldErrors.name || fieldErrors.icon) ? 'error' : undefined"
                        class="w-full"
                        :ui="{ base: 'rounded-e-none' }"
                    >
                        <template #leading>
                            <label
                                :for="`tag-color-${tag?.id ?? 'new'}`"
                                class="relative cursor-pointer"
                                :aria-label="t('tags.pickColor')"
                            >
                                <span
                                    class="block size-5 rounded-sm border border-default"
                                    :style="{ backgroundColor: color }"
                                />
                                <input
                                    :id="`tag-color-${tag?.id ?? 'new'}`"
                                    v-model="color"
                                    type="color"
                                    class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                            </label>
                        </template>
                    </UInput>
                </UFormField>

                <!-- Submit -->
                <UButton
                    type="submit"
                    :loading="loading"
                    :disabled="!validate()"
                    :ui="{ base: 'rounded-s-none' }"
                >
                    {{ isEditMode ? t('tags.update') : t('tags.create') }}
                </UButton>
            </div>

            <!-- Help text -->
            <p class="mt-2 text-xs text-muted">
                {{ t('tags.nameRules') }}<br>
                {{ t('tags.inputHelpLine1') }}<br>
                {{ t('tags.inputHelpLine2') }}<br>
                {{ t('tags.inputHelpLine3') }}
            </p>

            <!-- General error -->
            <LoadErrorAlert
                v-if="generalErrorRaw"
                :title="generalError ?? t('unknownError')"
                :error="generalErrorRaw"
                class="mt-3"
            />
            <UAlert
                v-else-if="generalError"
                color="error"
                :description="generalError"
                icon="i-lucide-alert-circle"
                class="mt-3"
            />
        </form>
    </div>
</template>
