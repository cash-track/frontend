<script setup lang="ts">
import { computed } from 'vue'
import type { User } from '@/api/models/user'

const props = defineProps<{
    user: User
    class?: string
}>()

const initials = computed(() => {
    let text = ''
    if (props.user.name) text += props.user.name[0].toUpperCase()
    if (props.user.lastName) text += props.user.lastName[0].toUpperCase()
    return text || props.user.nickName[0].toUpperCase()
})
</script>

<template>
    <UAvatar
        :src="user.photoUrl ?? undefined"
        :alt="user.displayName"
        :text="!user.photoUrl ? initials : undefined"
        size="xl"
        :class="props.class"
    />
</template>
