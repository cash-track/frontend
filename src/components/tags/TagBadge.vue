<script setup lang="ts">
import type { Tag } from '@/api/models/tag'

withDefaults(defineProps<{
    tag: Tag
    removable?: boolean
    highlighted?: boolean
}>(), {
    removable: false,
    highlighted: false,
})
</script>

<template>
    <button
        type="button"
        class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm border transition-colors cursor-pointer"
        :class="highlighted ? 'border-gray-400' : 'border-default hover:border-gray-400'"
        :style="tag.color ? { backgroundColor: tag.color + '1a' } : {}"
    >
        <span v-if="tag.icon">{{ tag.icon }}</span>
        {{ tag.name }}
        <UIcon v-if="removable" name="i-lucide-x" class="size-3" />
    </button>
</template>
