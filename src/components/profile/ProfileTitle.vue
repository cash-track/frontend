<script setup lang="ts">
import type { User } from '@/api/models/user'

defineProps<{ user: User }>()
</script>

<template>
    <div class="flex flex-col justify-center min-w-0">
        <h2 class="text-xl font-semibold truncate">{{ user.displayName }}</h2>
        <p class="text-muted text-sm truncate">@{{ user.nickName }}</p>
        <p class="text-muted text-sm truncate">{{ user.email }}</p>
    </div>
</template>
