<template>
    <div class="wallet">
        <warning-message message="Unable to load your wallet. Please try again later" :show="loadFailed"></warning-message>

        <div v-if="wallet.id">
            <div class="wallet-header d-flex justify-content-between">
                <h3>
                    {{ wallet.name }}

                    <b-badge class="float-right" variant="primary" v-if="wallet.isActive">active</b-badge>
                    <b-badge class="float-right" variant="secondary" v-if="wallet.isArchived">archived</b-badge>
                </h3>

                <div>
                    <b-btn-group>
                        <b-button variant="primary" :to="{name: 'wallets.edit', params: {walletID: wallet.id.toString()}}">
                            <b-icon-pencil></b-icon-pencil>
                            Edit
                        </b-button>
                        <b-dropdown right variant="primary">
                            <b-dropdown-header>More actions</b-dropdown-header>

                            <b-dropdown-item :to="{name: 'wallets.share', params: {walletID: wallet.id.toString()}}">Share</b-dropdown-item>

                            <b-dropdown-item v-if="!wallet.isActive" @click="onActivate">Activate</b-dropdown-item>
                            <b-dropdown-item v-if="wallet.isActive" @click="onDisable">Disable</b-dropdown-item>

                            <b-dropdown-item v-if="!wallet.isArchived" @click="onArchive">To Archive</b-dropdown-item>
                            <b-dropdown-item v-if="wallet.isArchived" @click="onUnArchive">Unarchive</b-dropdown-item>

                            <b-dropdown-divider></b-dropdown-divider>

                            <b-dropdown-item @click="onDelete">Delete</b-dropdown-item>
                        </b-dropdown>
                    </b-btn-group>
                </div>
            </div>

            <div class="wallet-owners">
                <span v-for="user of users" v-bind:key="user.id" class="mr-3">
                    <profile-avatar-badge :user="user"></profile-avatar-badge>
                </span>
            </div>

            <div class="wallet-details d-flex justify-content-between">
                <span class="text-left">
                    <span class="text-muted">Income</span><br>
                    <span class="text-success">
                        <b-icon-arrow-up variant="success" scale="1.5"></b-icon-arrow-up>
                        {{ walletTotal.totalIncomeAmount | money(wallet.defaultCurrency) }}
                    </span>
                </span>
                <span class="text-center">
                    <span class="text-muted">Available</span><br>
                    <span class="text-info">
                        {{ walletTotal.totalAmount | money(wallet.defaultCurrency) }}
                    </span>
                </span>
                <span class="text-right">
                    <span class="text-muted">Expense</span><br>
                    <span class="text-danger">
                        {{ walletTotal.totalExpenseAmount | money(wallet.defaultCurrency) }}
                        <b-icon-arrow-down variant="danger" scale="1.5"></b-icon-arrow-down>
                    </span>
                </span>
            </div>

            <div class="wallet-charges">
                <charges-list
                    :wallet="wallet"
                    @created="onChargeCreated"
                    @updated="onChargeUpdated"
                    @deleted="onChargeDeleted"
                ></charges-list>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import {
    emptyWallet,
    walletGet,
    walletTotalGet,
    walletUsersGet,
    walletDelete,
    walletActivate,
    walletDisable,
    walletArchive,
    walletUnArchive,
    WalletInterface,
    WalletTotalInterface
} from '@/api/wallets';
import { UserInterface } from '@/api/users';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import ProfileAvatarBadge from '@/components/profile/ProfileAvatarBadge.vue';
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue';
import ChargeItem from '@/components/wallets/ChargeItem.vue';
import ChargeCreate from '@/components/wallets/ChargeCreate.vue';
import ChargesList from "@/components/wallets/charges/ChargesList.vue";

@Component({
    components: {ChargesList, ChargeCreate, ChargeItem, ProfileAvatar, ProfileAvatarBadge, WarningMessage}
})
export default class WalletView extends Vue {
    @Prop()
    walletID!: number

    wallet: WalletInterface = emptyWallet()

    walletTotal: WalletTotalInterface = {
        totalAmount: 0,
        totalIncomeAmount: 0,
        totalExpenseAmount: 0,
    }

    loadFailed = false

    users: Array<UserInterface> = []

    mounted() {
        this.load()
        this.loadTotal()
        this.loadUsers()
    }

    protected load() {
        this.loadFailed = false;

        walletGet(this.walletID).then(response => {
            this.wallet = response.data.data
        }).catch(() => {
            this.loadFailed = true;
        })
    }

    protected loadTotal() {
        walletTotalGet(this.walletID).then(response => {
            this.walletTotal = response.data.data
        }).catch(() => {
            this.loadFailed = true;
        })
    }

    protected loadUsers() {
        walletUsersGet(this.walletID).then(response => {
            this.users = response.data.data
        }).catch(() => {
            this.loadFailed = true;
        })
    }

    protected onChargeCreated() {
        this.loadTotal()
    }

    protected onChargeUpdated() {
        this.loadTotal()
    }

    protected onChargeDeleted() {
        this.loadTotal()
    }

    protected onDelete(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        walletDelete(this.walletID).then(() => {
            this.$router.push({
                name: 'wallets'
            })
        }).catch(err => {
            console.log('Unable to delete wallet', err)
        })
    }

    protected onActivate(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        walletActivate(this.walletID).then(() => {
            this.wallet.isActive = true
        }).catch(err => {
            console.log('Unable to activate wallet', err)
        })
    }

    protected onDisable(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        walletDisable(this.walletID).then(() => {
            this.wallet.isActive = false
        }).catch(err => {
            console.log('Unable to disable wallet', err)
        })
    }

    protected onArchive(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        walletArchive(this.walletID).then(() => {
            this.wallet.isArchived = true
        }).catch(err => {
            console.log('Unable to archive wallet', err)
        })
    }

    protected onUnArchive(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        walletUnArchive(this.walletID).then(() => {
            this.wallet.isArchived = false
        }).catch(err => {
            console.log('Unable to un-archive wallet', err)
        })
    }
}
</script>

<style lang="scss" scoped>
h3 .badge {
    font-size: 12px;
    font-weight: 400;
    text-transform: uppercase;
    margin: 10px 0 0 10px;
}

.wallet-header {
    padding-bottom: 25px;
    padding-top: 5px;
}

.wallet-owners {
    border-top: 1px solid #eee;
    padding: 20px 0;

    &>span {
        white-space: nowrap;
        padding: 4px 0 8px;
    }
}

.wallet-details {
    padding: 20px 0 30px;
    border-top: 1px solid #eee;
    border-bottom: 1px solid #eee;

    .text-muted {
        font-size: 12px;
    }

    .text-success, .text-danger, .text-info {
        font-size: 40px;
        line-height: 40px;
    }
}
</style>
