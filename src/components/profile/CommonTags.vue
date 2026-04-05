<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCommonTags } from '@/api/tags'
import type { Tag } from '@/api/models/tag'
import TagChip from '@/components/tags/Tag.vue'

const { t } = useI18n()

const tags = ref<Tag[] | null>(null)
const loadFailed = ref(false)

onMounted(async () => {
    try {
        tags.value = await getCommonTags()
    } catch {
        loadFailed.value = true
    }
})
</script>

<template>
    <div>
        <h3 class="text-sm font-semibold text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
            {{ t('profile.commonTags') }}
            <UIcon v-if="!loadFailed && tags === null" name="i-lucide-loader-circle" class="size-3 animate-spin" />
            <UIcon v-if="loadFailed" name="i-lucide-triangle-alert" class="size-3 text-warning" />
        </h3>
        <div v-if="tags && tags.length > 0" class="flex flex-wrap gap-2">
            <TagChip
                v-for="tag in tags"
                :key="tag.id"
                :tag="tag"
                :navigable="true"
            />
        </div>
        <p v-else-if="tags && tags.length === 0" class="text-sm text-muted">—</p>
    </div>
</template>
