<script setup lang="ts">
import SecuritySettings from '@/components/settings/SecuritySettings.vue'
import PasskeysSettingsCard from '@/components/settings/passkeys/PasskeysSettingsCard.vue'
</script>

<template>
    <div class="space-y-4">
        <SecuritySettings />
        <PasskeysSettingsCard />
    </div>
</template>
