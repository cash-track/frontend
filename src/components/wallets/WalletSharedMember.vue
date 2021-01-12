<template>
    <div class="wallet-shared-member d-flex justify-content-between align-items-center">
        <profile-avatar-badge :user="user">
            {{ user.name }} {{ user.lastName }}
        </profile-avatar-badge>
        <b-button-close
            v-if="!isDeleted"
            v-show="!isLoading && !hasMessage"
            :title="tooltip"
            v-b-tooltip.right
            @click="onDelete"
        ></b-button-close>

        <b-spinner v-show="isLoading && !hasMessage" small></b-spinner>

        <b-icon-exclamation-triangle-fill
            class="warning-icon"
            v-if="hasMessage"
            variant="warning"
            v-b-popover="errorMessage"
            @click="onResetMessage"
        ></b-icon-exclamation-triangle-fill>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Mixins, Watch } from 'vue-property-decorator'
import Loader from '@/shared/Loader';
import Messager from '@/shared/Messager';
import ProfileAvatarBadge from '@/components/profile/ProfileAvatarBadge.vue';
import { UserInterface } from '@/api/users';
import { WalletInterface, walletUsersDelete } from '@/api/wallets';

export interface WalletSharedMemberDeletedEvent {
    id: number;
    user: UserInterface;
}

@Component({
    components: {ProfileAvatarBadge}
})
export default class WalletSharedMember extends Mixins(Loader, Messager) {
    @Prop({required: true})
    user!: UserInterface

    @Prop({required: true})
    wallet!: WalletInterface

    errorMessage = {
        id: `wallet-shared-member-message-${this.wallet.id}-${this.user.id}`,
        variant: 'warning',
        placement: 'right',
        trigger: 'hover focus',
        content: ''
    }

    isDeleted = false

    get tooltip(): string {
        return `Stop sharing ${this.wallet.name} for this user`
    }

    @Watch('message')
    onMessage() {
        this.errorMessage.content = this.message

        if (this.shouldDisplayMessage()) {
            this.$root.$emit('bv::show::popover', this.errorMessage.id)
        } else {
            this.$root.$emit('bv::hide::popover', this.errorMessage.id)
        }
    }

    onResetMessage(event: Event) {
        event.preventDefault()
        event.stopPropagation()
        this.resetMessage()
    }

    protected onDelete(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.resetMessage()
        this.setLoading()

        walletUsersDelete(this.wallet.id, this.user).then(() => {
            this.$emit('deleted', {
                id: this.user.id,
                user: this.user,
            })
            this.isDeleted = true
        }).catch(this.dispatchError).finally(this.setLoaded)
    }
}
</script>

<style lang="scss" scoped>
    .warning-icon {
        cursor: pointer;
    }
</style>
