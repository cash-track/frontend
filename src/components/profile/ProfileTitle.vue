<template>
    <div>
        <profile-avatar :user="user" size="200px"></profile-avatar>
        <h4 class="pt-3">{{ firstName }} {{ lastName }}</h4>
        <h5 class="text-muted">{{ nickName }}</h5>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue';
import { UserInterface } from '@/api/users';

@Component({
    components: {ProfileAvatar}
})
export default class ProfileTitle extends Vue {
    get user(): UserInterface {
        return this.$store.state.profile
    }

    get firstName(): string {
        return this.$store.state.profile.name
    }

    get lastName(): string {
        return this.$store.state.profile.lastName
    }

    get nickName(): string {
        return this.$store.state.profile.nickName
    }
}
</script>

<style scoped>

</style>