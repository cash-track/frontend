<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Tag } from '@/api/models/tag'

defineOptions({ name: 'TagChip' })

const props = withDefaults(defineProps<{
    tag: Tag
    removable?: boolean
    highlighted?: boolean
    navigable?: boolean
}>(), {
    removable: false,
    highlighted: false,
    navigable: false,
})

const router = useRouter()

function onClick() {
    if (props.navigable) {
        router.push({ name: 'tags.show', params: { tagID: props.tag.id } })
    }
}
</script>

<template>
    <button
        type="button"
        class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm border transition-colors cursor-pointer"
        :class="highlighted ? 'border-gray-400' : 'border-default hover:border-gray-400'"
        :style="tag.color ? { backgroundColor: tag.color + '1a' } : {}"
        @click="onClick"
    >
        <span v-if="tag.icon">{{ tag.icon }}</span>
        {{ tag.name }}
        <UIcon v-if="removable" name="i-lucide-x" class="size-3" />
    </button>
</template>
