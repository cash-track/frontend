<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/api/models/user'
import ProfileAvatar from './ProfileAvatar.vue'

const props = defineProps<{ user: User }>()

const auth = useAuthStore()
const isEmailConfirmed = computed(() => auth.isEmailConfirmed)
</script>

<template>
    <div class="relative inline-block">
        <ProfileAvatar :user="props.user" class="size-24 text-2xl" />
        <span
            class="absolute bottom-0 right-0 size-4 rounded-full border-2 border-white"
            :class="isEmailConfirmed ? 'bg-success' : 'bg-warning'"
        />
    </div>
</template>
