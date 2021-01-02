<template>
    <div>
        <h4 class="pt-3">{{ firstName }} {{ lastName }} (@{{ nickName }})</h4>
        <h6>
            <a :href="`mailto:${email}`">{{ email }}</a>

            <b-badge v-if="isEmailConfirmed" variant="success" v-b-tooltip="'Your account has been confirmed'">confirmed</b-badge>
            <b-badge v-else variant="warning" v-b-tooltip="'Your account still not confirmed, please check your mail to find confirmation link'">not confirmed</b-badge>
        </h6>
        <hr>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default class ProfileTitle extends Vue {
    get firstName(): string {
        return this.$store.state.profile.name
    }

    get lastName(): string {
        return this.$store.state.profile.lastName
    }

    get nickName(): string {
        return this.$store.state.profile.nickName
    }

    get email(): string {
        return this.$store.state.profile.email
    }

    get isEmailConfirmed(): boolean {
        return this.$store.state.profile.isEmailConfirmed
    }
}
</script>

<style scoped>
    a + .badge {
        margin-left: 5px;
    }
</style>