<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { getTags, deleteTag } from '@/api/tags'
import type { Tag } from '@/api/models/tag'
import TagComponent from '@/components/tags/Tag.vue'
import CreateTag from '@/components/tags/CreateTag.vue'
import TagForm from '@/components/tags/TagForm.vue'
import ConfirmModal from '@/components/Shared/ConfirmModal.vue'

const { t } = useI18n()
const router = useRouter()

const tags = ref<Tag[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const editingTag = ref<Tag | null>(null)
const editModalOpen = ref(false)

const deletingTag = ref<Tag | null>(null)
const deleteModalOpen = ref(false)
const deleteLoading = ref(false)
const deleteError = ref<string | null>(null)

async function loadTags() {
    loading.value = true
    error.value = null
    try {
        tags.value = await getTags()
    } catch {
        error.value = t('tags.statsLoadingError')
    } finally {
        loading.value = false
    }
}

function onTagCreated(tag: Tag) {
    tags.value = [tag, ...tags.value]
}

function viewTag(tag: Tag) {
    router.push({ name: 'tags.show', params: { tagID: tag.id.toString() } })
}

function openEdit(tag: Tag) {
    editingTag.value = tag
    editModalOpen.value = true
}

function onTagUpdated(updated: Tag) {
    tags.value = tags.value.map(t => t.id === updated.id ? updated : t)
    editModalOpen.value = false
    editingTag.value = null
}

function openDelete(tag: Tag) {
    deletingTag.value = tag
    deleteError.value = null
    deleteModalOpen.value = true
}

async function confirmDelete() {
    if (!deletingTag.value) return
    deleteError.value = null
    deleteLoading.value = true
    try {
        await deleteTag(deletingTag.value.id)
        tags.value = tags.value.filter(t => t.id !== deletingTag.value!.id)
        deleteModalOpen.value = false
        deletingTag.value = null
    } catch {
        deleteError.value = t('tags.deleteError')
    } finally {
        deleteLoading.value = false
    }
}

onMounted(loadTags)
</script>

<template>
    <div class="space-y-6">
        <!-- Header -->
        <div>
            <h1 class="text-2xl font-semibold">{{ t('tags.tags') }}</h1>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
            <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
        </div>

        <!-- Error -->
        <template v-else-if="error">
            <UAlert
                color="error"
                :description="error"
                icon="i-lucide-alert-circle"
            />
            <div class="flex justify-center mt-2">
                <UButton
                    variant="outline"
                    color="neutral"
                    size="md"
                    @click="loadTags()"
                >
                    {{ t('retry') }}
                </UButton>
            </div>
        </template>

        <template v-else>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Tags list -->
                <div>
                    <!-- Tags grid -->
                    <div v-if="tags.length > 0" class="flex flex-wrap gap-2">
                        <UPopover
                            v-for="tag in tags"
                            :key="tag.id"
                        >
                            <TagComponent :tag="tag" />
                            <template #content>
                                <div class="flex gap-1 p-1">
                                    <UButton
                                        variant="ghost"
                                        color="neutral"
                                        size="xs"
                                        icon="i-lucide-eye"
                                        :label="t('tags.view')"
                                        @click="viewTag(tag)"
                                    />
                                    <UButton
                                        variant="ghost"
                                        color="neutral"
                                        size="xs"
                                        icon="i-lucide-pencil"
                                        :label="t('tags.edit')"
                                        @click="openEdit(tag)"
                                    />
                                    <UButton
                                        variant="ghost"
                                        color="error"
                                        size="xs"
                                        icon="i-lucide-trash-2"
                                        :label="t('common.delete')"
                                        @click="openDelete(tag)"
                                    />
                                </div>
                            </template>
                        </UPopover>
                    </div>

                    <!-- Empty state -->
                    <div v-else class="flex flex-col items-center justify-center py-16 text-muted">
                        <UIcon name="i-lucide-tag" class="size-12 mb-3 opacity-30" />
                        <p class="text-sm">{{ t('tags.addNew') }}</p>
                    </div>
                </div>

                <!-- Create form -->
                <div class="border border-default rounded-lg p-4 self-start">
                    <h2 class="text-sm font-medium text-muted mb-3">{{ t('tags.addNew') }}</h2>
                    <CreateTag @tag-created="onTagCreated" />
                </div>
            </div>

            <!-- Info alert -->
            <UAlert
                color="neutral"
                variant="subtle"
                :description="`${t('tags.editInfoLine1')} ${t('tags.editInfoLine2')}`"
                icon="i-lucide-info"
            />
        </template>

        <!-- Edit modal -->
        <UModal
            v-model:open="editModalOpen"
            :title="editingTag?.name ?? t('tags.update')"
        >
            <template #body>
                <TagForm
                    :tag="editingTag"
                    @tag-updated="onTagUpdated"
                />
            </template>
        </UModal>

        <ConfirmModal
            v-model:open="deleteModalOpen"
            :title="t('common.delete')"
            :description="t('tags.deletingConfirm', { name: deletingTag?.name ?? '' })"
            :loading="deleteLoading"
            :error="deleteError"
            @confirm="confirmDelete"
            @update:open="val => { if (!val) deleteError = null }"
        >
            <TagComponent v-if="deletingTag" :tag="deletingTag" />
        </ConfirmModal>
    </div>
</template>
