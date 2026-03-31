<script setup lang="ts">
import type { Tag } from '@/api/models/tag'
import TagForm from './TagForm.vue'

const emit = defineEmits<{
    'tag-created': [tag: Tag]
}>()
</script>

<template>
    <TagForm @tag-created="emit('tag-created', $event)" />
</template>
