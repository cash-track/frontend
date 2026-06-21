<script setup lang="ts">
defineProps<{ isOpen?: boolean }>()
</script>

<template>
    <UIcon :name="isOpen ? 'i-lucide-x' : 'i-lucide-menu'" class="size-5" />
</template>
