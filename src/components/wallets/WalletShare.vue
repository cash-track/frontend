<template>
    <b-card footer-tag="footer" header-tag="header" class="wallet-share">
        <template v-slot:header v-if="isWalletLoaded">
            <b-button-close @click="onClose"></b-button-close>
            {{ $t('wallets.shareTitle') }} <b>{{ wallet.name }}</b>
        </template>

        <email-is-not-confirmed-alert></email-is-not-confirmed-alert>

        <warning-message :message="$t('wallets.shareMembersLoadingError')" :show="loadUsersFailed"></warning-message>

        <div class="wallet-owners">
            <b-list-group>
                <b-list-group-item v-for="user of users" v-bind:key="user.id">
                    <wallet-shared-member :wallet="wallet" :user="user" @deleted="onDeleted" :is-allowed-to-remove="users.length > 1"></wallet-shared-member>
                </b-list-group-item>
            </b-list-group>
        </div>

        <hr v-if="commonUsersFiltered.length">

        <div class="wallet-owners" v-if="commonUsersFiltered.length">
            <small class="form-text text-muted mb-2">{{ $t('wallets.shareCommonUsers') }}</small>
            <b-list-group>
                <b-list-group-item v-for="user of commonUsersFiltered" v-bind:key="user.id">
                    <div class="d-flex justify-content-between align-items-center">
                        <profile-avatar-badge :user="user">
                            {{ user.name }} {{ user.lastName }} ({{ user.email }})
                        </profile-avatar-badge>
                        <b-button variant="primary" :disabled="!isEmailConfirmed || isLoading" @click="onSelect(user)">
                            {{ $t('wallets.shareSelect') }}
                        </b-button>
                    </div>
                </b-list-group-item>
            </b-list-group>
        </div>

        <hr>

        <warning-message :message="message" :show="hasMessage" @dismissed="resetMessage"></warning-message>

        <b-form @submit="onSearch" v-if="inviteUser === null">
            <b-form-group
                label-for="email"
                :invalid-feedback="validationMessage('email')"
                :state="validationState('email')"
                :description="$t('wallets.shareEmailHint')"
            >
                <b-input-group>
                    <b-form-input
                        id="email"
                        v-model="inviteUserEmail"
                        class="col-md-12"
                        required
                        type="text"
                        :disabled="isLoading"
                        :state="validationState('email')"
                        @change="resetValidationMessage('email')"
                    ></b-form-input>
                    <b-input-group-append>
                        <b-button variant="primary" :disabled="!isEmailConfirmed || isLoading" @click="onSearch">
                            <b-spinner v-show="isLoading" small></b-spinner>
                            {{ $t('wallets.shareSearch') }}
                        </b-button>
                    </b-input-group-append>
                </b-input-group>
            </b-form-group>
        </b-form>

        <b-list-group v-if="inviteUser !== null">
            <b-list-group-item class="d-flex justify-content-between">
                <profile-avatar-badge :user="inviteUser">{{ inviteUser.name }} {{ inviteUser.lastName }} ({{ inviteUser.email }})</profile-avatar-badge>
                <b-button variant="primary" :disabled="!isEmailConfirmed || isLoading" @click="onInvite">
                    <b-spinner v-show="isLoading" small></b-spinner>
                    {{ $t('wallets.shareInvite') }}
                </b-button>
            </b-list-group-item>
        </b-list-group>
    </b-card>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import Loader from '@/shared/Loader';
import Messager from '@/shared/Messager';
import Validator from '@/shared/Validator';
import {
    WalletInterface,
    WalletsRepositoryInterface,
    WalletsRepository
} from '@/api/wallets';
import {
    UserInterface,
    UsersRepositoryInterface,
    UsersRepository
} from '@/api/users'
import WarningMessage from '@/components/shared/WarningMessage.vue';
import ProfileAvatarBadge from '@/components/profile/ProfileAvatarBadge.vue';
import WalletSharedMember, { WalletSharedMemberDeletedEvent } from '@/components/wallets/WalletSharedMember.vue';
import EmailIsNotConfirmedAlert from '@/components/profile/EmailIsNotConfirmedAlert.vue';

@Component({
    components: {EmailIsNotConfirmedAlert, WalletSharedMember, ProfileAvatarBadge, WarningMessage}
})
export default class WalletShare extends Mixins(Loader, Messager, Validator) {
    @Prop({
        required: true
    })
    wallet!: WalletInterface
    isWalletLoaded = false

    walletsRepository: WalletsRepositoryInterface = new WalletsRepository()
    usersRepository: UsersRepositoryInterface = new UsersRepository()

    users: Array<UserInterface> = []
    loadUsersFailed = false

    inviteUserEmail = ''
    inviteUser: UserInterface|null = null

    commonUsers: Array<UserInterface> = []

    mounted() {
        this.onWalletLoaded()
    }

    get isEmailConfirmed(): boolean {
        return this.$store.state.isEmailConfirmed
    }

    get commonUsersFiltered() {
        const list = new Array<UserInterface>()
        const ignored = []

        ignored.push(...this.users.map(user => user.id))

        if (this.inviteUser !== null) {
            ignored.push(this.inviteUser.id)
        }

        for (const user of this.commonUsers) {
            if (ignored.indexOf(user.id) !== -1) {
                continue
            }

            list.push(user)
        }

        return list
    }

    @Watch('wallet')
    protected onWalletLoaded() {
        this.isWalletLoaded = this.wallet !== null && this.wallet.id !== 0

        if (this.isWalletLoaded) {
            this.loadUsers()
            this.loadCommonUsers()
        }
    }

    protected loadUsers() {
        this.loadUsersFailed = false

        this.walletsRepository.getUsers(this.wallet.id).then(response => {
            this.users = response.data.data
        }).catch(() => {
            this.loadUsersFailed = true;
        })
    }

    protected loadCommonUsers() {
        this.usersRepository.findByCommonWallets().then(response => {
            this.commonUsers = response.data.data
        }).catch(() => {
            //
        })
    }

    protected onSearch(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.resetValidationMessages()
        this.resetMessage()
        this.setLoading()

        this.usersRepository.findByEmail(this.inviteUserEmail).then(response => {
            this.inviteUser = response.data.data
        }).catch(() => {
            this.setValidationMessage('email', this.$t('wallets.shareSearchError').toString())
        }).finally(this.setLoaded)
    }

    protected onSelect(user: UserInterface) {
        this.inviteUser = user;
    }

    protected onInvite(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        if (this.inviteUser === null) {
            return
        }

        const user: UserInterface = this.inviteUser

        this.resetValidationMessages()
        this.resetMessage()
        this.setLoading()

        this.walletsRepository.addUser(this.wallet.id, this.inviteUser).then(() => {
            this.$store.dispatch('loadActiveWallets')
            this.users.push(user)
            this.inviteUser = null
            this.inviteUserEmail = ''
        }).catch(this.dispatchError).finally(this.setLoaded)
    }

    protected onDeleted(event: WalletSharedMemberDeletedEvent) {
        const index = this.users.findIndex(user => user.id === event.id)

        if (index === -1) {
            console.log('Unable to find deleted wallet member. User ID:', event.id)
            return
        }

        this.users.splice(index, 1)
    }

    protected onClose() {
        this.$router.push({
            name: 'wallets.show',
            params: {
                walletID: this.wallet.id.toString(),
                nameForTitle: this.wallet.name,
            }
        })
    }
}
</script>

<style lang="scss" scoped>
.wallet-share {
    .card-footer button {
        margin: 0 5px;
    }

    .wallet-owners {
        .list-group-item {
            .close {
                padding: 6px 10px;
            }
        }
    }
}
</style>