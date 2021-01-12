<template>
    <span class="profile-avatar-badge">
        <profile-avatar :user="user" class="mr-2"></profile-avatar>
        <slot name="default">{{ user.name }}</slot>
    </span>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { UserInterface } from '@/api/users';
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue';

@Component({
    components: {ProfileAvatar}
})
export default class ProfileAvatarBadge extends Vue {
    @Prop({required: true})
    user!: UserInterface
}
</script>

<style lang="scss" scoped>
    .profile-avatar-badge {
        margin-right: 10px;
    }
</style>
