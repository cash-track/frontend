<template>
    <div>
        <security-settings />
        <passkeys-settings-card class="mt-4" />
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import SecuritySettings from '@/components/settings/SecuritySettings.vue';
import PasskeysSettingsCard from '@/components/settings/passkeys/PasskeysSettingsCard.vue';

@Component({
    components: {SecuritySettings, PasskeysSettingsCard}
})
export default class SecuritySettingsView extends Vue {}
</script>

<style scoped>

</style>