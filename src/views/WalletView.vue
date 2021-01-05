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
                        <b-dropdown right split variant="primary">
                            <template v-slot:button-content>
                                <b-icon-pencil></b-icon-pencil>
                                Edit
                            </template>

                            <b-dropdown-header>More actions</b-dropdown-header>

                            <b-dropdown-item>Share</b-dropdown-item>

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
                <span v-for="user of users" v-bind:key="user.id">
                    <profile-avatar-badge :user="user"></profile-avatar-badge>
                </span>
            </div>

            <div class="wallet-details d-flex justify-content-between">
                <span class="text-left">
                    <span class="text-muted">Income</span><br>
                    <span class="text-success">
                        <b-icon-arrow-up variant="success" scale="1.5"></b-icon-arrow-up>
                        {{ walletTotal.totalIncomeAmount }} {{ wallet.defaultCurrency.char }}
                    </span>
                </span>
                <span class="text-center">
                    <span class="text-muted">Available</span><br>
                    <span class="text-info">
                        {{ walletTotal.totalAmount }} {{ wallet.defaultCurrency.char }}
                    </span>
                </span>
                <span class="text-right">
                    <span class="text-muted">Expense</span><br>
                    <span class="text-danger">
                        {{ walletTotal.totalExpenseAmount }} {{ wallet.defaultCurrency.char }}
                        <b-icon-arrow-down variant="danger" scale="1.5"></b-icon-arrow-down>
                    </span>
                </span>
            </div>

            <div class="wallet-charges">
                <b-row class="charge-item" v-if="wallet.isActive">
                    <b-col offset-sm="4" sm="8" class="charge-main-container wallet-charge-create">
                        <b-icon-plus class="charge-type" variant="muted" scale="2"></b-icon-plus>

                        <b-button variant="outline-primary" v-b-toggle.charge-create>New Charge</b-button>
                        <b-collapse class="charge-create" id="charge-create">
                            <charge-create :wallet="wallet" @created="onChargeCreated"></charge-create>
                        </b-collapse>
                    </b-col>
                </b-row>
                <charge-item
                    v-for="charge of charges"
                    v-bind:key="charge.id"
                    :wallet="wallet"
                    :charge="charge"
                    @updated="onChargeUpdated"
                    @deleted="onChargeDeleted"
                ></charge-item>
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
import { walletChargesGet, ChargeInterface } from '@/api/charges';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import {ProfileInterface} from '@/api/profile';
import ProfileAvatarBadge from '@/components/profile/ProfileAvatarBadge.vue';
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue';
import ChargeItem, {ChargeDeletedEvent} from '@/components/wallets/ChargeItem.vue';
import ChargeCreate, { ChargeCreatedEvent } from '@/components/wallets/ChargeCreate.vue';
import { ChargeUpdatedEvent } from '@/components/wallets/ChargeEdit.vue';

@Component({
    components: {ChargeCreate, ChargeItem, ProfileAvatar, ProfileAvatarBadge, WarningMessage}
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

    users: Array<ProfileInterface> = []

    charges: Array<ChargeInterface> = []

    mounted() {
        this.load()
        this.loadTotal()
        this.loadUsers()
        this.loadCharges()
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

    protected loadCharges() {
        walletChargesGet(this.walletID).then(response => {
            this.charges = response.data.data
        }).catch(() => {
            this.loadFailed = true;
        })
    }

    protected onChargeCreated(event: ChargeCreatedEvent) {
        this.charges.unshift(event.charge)
        this.$root.$emit('bv::toggle::collapse', 'charge-create')
        this.loadTotal()
    }

    protected onChargeUpdated(event: ChargeUpdatedEvent) {
        const charges = Array.from<ChargeInterface>(this.charges)
        const index = charges.findIndex(charge => charge.id === event.id)

        if (index === -1) {
            console.warn('Unable to find charge in the list. Charge ID:', event.id)
            return
        }

        charges[index] = event.charge

        this.charges = charges

        this.loadTotal()
    }

    protected onChargeDeleted(event: ChargeDeletedEvent) {
        const index = this.charges.findIndex(charge => charge.id === event.id)

        if (index === -1) {
            console.warn('Unable to find charge in the list. Charge ID:', event.id)
            return
        }

        this.charges.splice(index, 1)

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

.charge-date-container {
    padding-top: 10px;
    position: relative;

    .charge-date {
        font-size: 14px;
    }

    .charge-avatar {
        margin: 0 6px 0 35px;
    }
}

.wallet-charge-item {
    border-left: 1px solid #eee;
    padding: 18px 45px 20px;
    position: relative;

    .charge-type {
        position: absolute;
        left: -12px;
        top: 18px;
        background: #fff;
        padding: 6px;
        height: 24px;
        width: 24px;
        text-align: center;
        font-size: 20px;
        line-height: 20px;
        border-radius: 40px;
    }

    .charge-pointer {
        display: block;
        position: absolute;
        top: 30px;
        left: 12px;
        width: 30px;
        height: 0;
        border-top: 1px solid #eee;
    }

    .charge-header {
        cursor: pointer;

        .charge-amount {
            font-weight: 700;
            display: inline-block;
            width: 110px;
            padding: 0 10px 0 0;
        }

        .charge-title {
            overflow: hidden;
            white-space: pre;
            text-overflow: ellipsis;
            max-width: calc(100% - 200px);
            display: inline-block;
            vertical-align: top;
        }
    }

    .charge-body {
        padding-top: 10px;

        &>span {
            white-space: pre;
        }
    }

    &:hover .charge-type {
        cursor: pointer;
        background-color: #eee!important;
    }
}

.wallet-charge-create {
    padding-top: 10px;
    padding-bottom: 35px;
    margin-top: 10px;

    .charge-create {
        padding-top: 20px;
    }
}
</style>
