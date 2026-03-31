<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Tag } from '@/api/models/tag'

const props = defineProps<{
    tag: Tag
}>()

const router = useRouter()

function navigate() {
    router.push({ name: 'tags.show', params: { tagID: props.tag.id } })
}
</script>

<template>
    <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border border-default transition-all cursor-pointer hover:shadow-sm hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
        :style="tag.color ? { '--tag-color': tag.color, backgroundColor: tag.color + '1a', borderColor: tag.color + '4d' } : {}"
        @click="navigate"
    >
        <span v-if="tag.icon" class="text-base leading-none">{{ tag.icon }}</span>
        <span>{{ tag.name }}</span>
    </button>
</template>
