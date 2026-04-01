<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { createTag, updateTag } from '@/api/tags'
import type { Tag } from '@/api/models/tag'
import { useApiErrors } from '@/composables/useApiErrors'
import { parseTagInput } from '@/shared/strings'
import TagChip from './Tag.vue'

const props = defineProps<{
    tag?: Tag | null
}>()

const emit = defineEmits<{
    'tag-created': [tag: Tag]
    'tag-updated': [tag: Tag]
}>()

const { t } = useI18n()
const { fieldErrors, generalError, reset: resetErrors, handleError } = useApiErrors()

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
</script>

<template>
    <div class="space-y-4">
        <!-- Preview -->
        <div class="flex items-center gap-2">
            <span class="text-sm text-muted">{{ t('tags.preview') }}:</span>
            <TagChip :tag="previewTag" />
        </div>

        <form novalidate @submit.prevent="onSubmit">
            <div class="flex flex-col sm:flex-row sm:items-start gap-2">
                <!-- Color picker -->
                <div class="flex items-center gap-1 shrink-0">
                    <label
                        :for="`tag-color-${tag?.id ?? 'new'}`"
                        class="relative cursor-pointer"
                    >
                        <span
                            class="block size-9 rounded-md border-2 border-default transition-all hover:border-primary/40"
                            :style="{ backgroundColor: color }"
                        />
                        <input
                            :id="`tag-color-${tag?.id ?? 'new'}`"
                            v-model="color"
                            type="color"
                            class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                    </label>
                </div>

                <!-- Name + emoji field -->
                <UFormField
                    class="flex-1"
                    :error="fieldErrors.name?.[0] ?? fieldErrors.icon?.[0]"
                >
                    <UInput
                        v-model="nameInput"
                        required
                        type="text"
                        :placeholder="t('tags.inputLabel')"
                        autocomplete="off"
                        :disabled="loading"
                        :status="(fieldErrors.name || fieldErrors.icon) ? 'error' : undefined"
                    />
                </UFormField>

                <!-- Submit -->
                <UButton
                    type="submit"
                    :loading="loading"
                    :disabled="!validate()"
                    class="shrink-0"
                >
                    {{ isEditMode ? t('tags.update') : t('tags.create') }}
                </UButton>
            </div>

            <!-- Help text -->
            <p class="mt-2 text-xs text-muted">
                {{ t('tags.inputHelpLine2') }}<br>
                {{ t('tags.inputHelpLine3') }}
            </p>

            <!-- General error -->
            <UAlert
                v-if="generalError"
                color="error"
                :description="generalError"
                icon="i-lucide-alert-circle"
                class="mt-3"
            />
        </form>
    </div>
</template>
