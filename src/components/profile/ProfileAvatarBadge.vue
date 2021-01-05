<template>
    <span class="profile-avatar-badge">
        <profile-avatar :user="user"></profile-avatar>
        {{ user.name }}
    </span>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { ProfileInterface } from '@/api/profile';
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue';

@Component({
    components: {ProfileAvatar}
})
export default class ProfileAvatarBadge extends Vue {
    @Prop()
    user!: ProfileInterface
}
</script>

<style lang="scss" scoped>
    .profile-avatar-badge {
        margin-right: 10px;
    }
</style>
