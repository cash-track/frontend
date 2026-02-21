<template>
    <div>
        <profile-settings></profile-settings>
        <profile-photo class="mt-4"></profile-photo>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import ProfileSettings from '@/components/settings/ProfileSettings.vue';
import ProfilePhoto from '@/components/settings/ProfilePhoto.vue';

@Component({
    components: {ProfileSettings, ProfilePhoto}
})
export default class ProfileSettingsView extends Vue {}
</script>

<style scoped>

</style>