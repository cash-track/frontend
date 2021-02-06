<template>
    <b-row class="personal-settings">
        <b-col md="4" class="mb-3">
            <b-card no-body header="Personal Settings">
                <b-list-group flush>
                    <b-list-group-item :to="{name: 'settings.profile'}" exact-active-class="active">Profile</b-list-group-item>
                    <b-list-group-item :to="{name: 'settings.security'}" exact-active-class="active">Security</b-list-group-item>
                </b-list-group>
            </b-card>
        </b-col>
        <b-col md="8">
            <router-view></router-view>
        </b-col>
    </b-row>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default class SettingsView extends Vue {}
</script>

<style scoped>
.personal-settings .card > .list-group {
    border-top: none;
}
</style>