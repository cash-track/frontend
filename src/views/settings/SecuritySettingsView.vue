<template>
    <security-settings></security-settings>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import SecuritySettings from "@/components/settings/SecuritySettings.vue";

@Component({
    components: {SecuritySettings}
})
export default class SecuritySettingsView extends Vue {}
</script>

<style scoped>

</style>