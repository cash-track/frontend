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
                        <b-button variant="primary" :to="{name: 'wallets.edit', params: {walletID: wallet.id.toString(), nameForTitle: wallet.name}}">
                            <b-icon-pencil></b-icon-pencil>
                            Edit
                        </b-button>
                        <b-dropdown right variant="primary">
                            <b-dropdown-header>More actions</b-dropdown-header>

                            <b-dropdown-item :to="{name: 'wallets.share', params: {walletID: wallet.id.toString(), nameForTitle: wallet.name}}">Share</b-dropdown-item>

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

            <div class="wallet-details d-flex justify-content-center align-items-end">
                 <span class="wallet-total" v-if="!hasTag">
                    <span class="text-muted wallet-total-title">Available</span>
                    <span class="text-success wallet-total-value">
                        {{ walletTotal.totalAmount | money(wallet.defaultCurrency) }}
                    </span>
                </span>
                <span class="wallet-total" :class="{'wallet-total-small': !hasTag || !isIncomeGreaterThanExpense}" v-if="hasIncome && isIncomeGreaterThanExpense">
                    <span class="text-muted wallet-total-title">
                        Income
                    </span>
                    <span class="text-success wallet-total-value">
                        <b-icon-arrow-up variant="success" scale="1" class="d-none d-sm-inline"></b-icon-arrow-up>
                        {{ walletTotal.totalIncomeAmount | money(wallet.defaultCurrency) }}
                    </span>
                </span>
                <span class="wallet-total" :class="{'wallet-total-small': !hasTag || isIncomeGreaterThanExpense}" v-if="hasExpense">
                    <span class="text-muted wallet-total-title">Expense</span>
                    <span class="text-danger wallet-total-value">
                        <b-icon-arrow-down variant="danger" scale="1" class="d-none d-sm-inline"></b-icon-arrow-down>
                        {{ walletTotal.totalExpenseAmount | money(wallet.defaultCurrency) }}
                    </span>
                </span>
                <span class="wallet-total" :class="{'wallet-total-small': !hasTag}" v-if="hasIncome && !isIncomeGreaterThanExpense">
                    <span class="text-muted wallet-total-title">
                        Income
                    </span>
                    <span class="text-success wallet-total-value">
                        <b-icon-arrow-up variant="success" scale="1" class="d-none d-sm-inline"></b-icon-arrow-up>
                        {{ walletTotal.totalIncomeAmount | money(wallet.defaultCurrency) }}
                    </span>
                </span>
            </div>

            <div class="wallet-tags" v-show="tags.length">
                <tag v-for="tag of tags"
                     :tag="tag"
                     :key="tag.id"
                     @selected="onTagSelected"
                     :state="tag.id === tagIDParsed ? 'closable' : null"
                     :active="tag.id === tagIDParsed"
                ></tag>
            </div>

            <div class="wallet-charges">
                <charges-list
                    :wallet="wallet"
                    :tag="tag"
                    @created="onChargeCreated"
                    @updated="onChargeUpdated"
                    @deleted="onChargeDeleted"
                ></charges-list>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
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
    WalletTotalInterface, walletTagsGet, walletTagTotalGet
} from '@/api/wallets';
import { UserInterface } from '@/api/users';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import ProfileAvatarBadge from '@/components/profile/ProfileAvatarBadge.vue';
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue';
import ChargeItem from '@/components/wallets/ChargeItem.vue';
import ChargeCreate from '@/components/wallets/ChargeCreate.vue';
import ChargesList from "@/components/wallets/charges/ChargesList.vue";
import Tag from '@/components/tags/Tag.vue';
import { TagInterface } from '@/api/tags';

@Component({
    components: {ChargesList, ChargeCreate, ChargeItem, ProfileAvatar, ProfileAvatarBadge, WarningMessage, Tag}
})
export default class WalletView extends Vue {
    @Prop()
    walletID!: number

    @Prop()
    tagID!: string

    wallet: WalletInterface = emptyWallet()

    walletTotal: WalletTotalInterface = {
        totalAmount: 0,
        totalIncomeAmount: 0,
        totalExpenseAmount: 0,
    }

    loadFailed = false

    users: Array<UserInterface> = []

    tags: Array<TagInterface> = []

    tag: TagInterface|null = null

    mounted() {
        this.load()
        this.loadTotal()
        this.loadUsers()
        this.loadTags()
    }

    get tagIDParsed(): number {
        return parseInt(this.tagID, 10)
    }

    get hasTag(): boolean {
        return this.tagID !== undefined
    }

    get isIncomeGreaterThanExpense(): boolean {
        return this.walletTotal.totalIncomeAmount > this.walletTotal.totalExpenseAmount
    }

    get hasIncome(): boolean {
        return this.walletTotal.totalIncomeAmount !== 0
    }

    get hasExpense(): boolean {
        return this.walletTotal.totalExpenseAmount !== 0
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
        (
            this.hasTag ?
                walletTagTotalGet(this.walletID, this.tagIDParsed) :
                walletTotalGet(this.walletID)
        ).then(response => {
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

    protected loadTags() {
        walletTagsGet(this.walletID).then(response => {
            this.tags = response.data.data
            this.setByTagIfPresent()
        })
    }

    protected setByTagIfPresent() {
        if (!this.hasTag) {
            this.tag = null
            return
        }

        for(const tag of this.tags) {
            if (tag.id === this.tagIDParsed) {
                this.tag = tag
                return
            }
        }

        this.loadFailed = true
    }

    protected onChargeCreated() {
        this.loadTotal()
        this.loadTags()
    }

    protected onChargeUpdated() {
        this.loadTotal()
        this.loadTags()
    }

    protected onChargeDeleted() {
        this.loadTotal()
        this.loadTags()
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

    @Watch('tagID')
    protected onTagChange() {
        this.setByTagIfPresent()
        this.loadTotal()
    }

    protected onTagSelected(tag: TagInterface) {
        if (this.hasTag && this.tag?.id === tag.id) {
            this.$router.push({
                name: 'wallets.show',
                params: {
                    'walletID': this.walletID.toString(),
                }
            })
            return
        }

        this.$router.push({
            name: 'wallets.tags.show',
            params: {
                'walletID': this.walletID.toString(),
                'tagID': tag.id.toString(),
            }
        })
    }
}
</script>

<style lang="scss" scoped>
@import "node_modules/bootstrap/scss/functions";
@import "node_modules/bootstrap/scss/variables";
@import "node_modules/bootstrap/scss/mixins/_breakpoints";

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
    padding: 16px 0;

    &>span {
        white-space: nowrap;
        padding: 4px 0;
        display: inline-block;
    }
}

.wallet-details {
    padding: 15px 0 15px;
    border-top: 1px solid #eee;
    border-bottom: 1px solid #eee;

    .wallet-total {
        display: inline-block;
        margin: 0 10px;
        text-align: left;

        .wallet-total-title {
            font-size: 12px;
            display: block;
        }

        .wallet-total-value {
            white-space: nowrap;
            font-size: 40px;
            line-height: 40px;
        }

        &.wallet-total-small {
            .wallet-total-value {
                font-size: 20px;
                line-height: 20px;
            }
        }
    }
}

.wallet-tags {
    padding: 20px 0 15px;
    border-bottom: 1px solid #eee;

    .wallet-tags-label {
        font-size: 12px;
    }
}

@include media-breakpoint-down(sm) {
    .wallet-header {
        flex-wrap: wrap;
    }

    .wallet-details {
        flex-wrap: wrap;

        .wallet-total {
            text-align: center;
        }

        .wallet-total:not(.wallet-total-small) {
            display: block;
            width: 100%;
        }
    }
}
</style>
