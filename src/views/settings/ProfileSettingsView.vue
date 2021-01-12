<template>
    <profile-settings></profile-settings>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import ProfileSettings from '@/components/settings/ProfileSettings.vue';

@Component({
    components: {ProfileSettings}
})
export default class ProfileSettingsView extends Vue {}
</script>

<style scoped>

</style>