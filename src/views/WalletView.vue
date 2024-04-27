<template>
    <div class="wallet">
        <wallets-active-short-list class="mb-4"></wallets-active-short-list>

        <email-is-not-confirmed-alert></email-is-not-confirmed-alert>

        <warning-message :message="$t('wallets.loadingError')" :show="loadFailed"></warning-message>

        <div v-if="wallet.id">
            <div class="wallet-header d-flex justify-content-between">
                <h3>
                    {{ wallet.name }}

                    <b-badge class="float-right" variant="primary" v-if="wallet.isActive">{{ $t('wallets.active') }}</b-badge>
                    <b-badge class="float-right" variant="secondary" v-if="wallet.isArchived">{{ $t('wallets.archived') }}</b-badge>
                </h3>

                <div>
                    <b-btn-group>
                        <b-button variant="primary"
                                  :to="{name: 'wallets.edit', params: {walletID: wallet.id.toString(), nameForTitle: wallet.name}}"
                                  :disabled="!isEmailConfirmed"
                        >
                            <b-icon-pencil></b-icon-pencil>
                            {{ $t('wallets.edit') }}
                        </b-button>
                        <b-dropdown right variant="primary">
                            <b-dropdown-header>{{ $t('wallets.moreActions') }}</b-dropdown-header>

                            <b-dropdown-item :to="{name: 'wallets.share', params: {walletID: wallet.id.toString(), nameForTitle: wallet.name}}">{{ $t('wallets.share') }}</b-dropdown-item>

                            <b-dropdown-item v-if="!wallet.isActive" @click="onActivate" :disabled="!isEmailConfirmed">{{ $t('wallets.activate') }}</b-dropdown-item>
                            <b-dropdown-item v-if="wallet.isActive" @click="onDisable" :disabled="!isEmailConfirmed">{{ $t('wallets.disable') }}</b-dropdown-item>

                            <b-dropdown-item v-if="!wallet.isArchived" @click="onArchive" :disabled="!isEmailConfirmed">{{ $t('wallets.toArchive') }}</b-dropdown-item>
                            <b-dropdown-item v-if="wallet.isArchived" @click="onUnArchive" :disabled="!isEmailConfirmed">{{ $t('wallets.unArchive') }}</b-dropdown-item>

                            <b-dropdown-divider></b-dropdown-divider>

                            <b-dropdown-item @click="onDelete" :disabled="!isEmailConfirmed">{{ $t('wallets.delete') }}</b-dropdown-item>
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
                 <span class="wallet-total">
                    <span class="text-muted wallet-total-title">{{ $t('wallets.available') }}</span>
                    <span class="text-success wallet-total-value">
                        {{ walletTotal.totalAmount | money(wallet.defaultCurrency) }}
                    </span>
                </span>
                <span class="wallet-total wallet-total-small">
                    <span class="text-muted wallet-total-title">
                        {{ $t('wallets.income') }}
                    </span>
                    <span class="text-primary wallet-total-value">
                        <b-icon-arrow-up variant="primary" scale="1" class="d-none d-sm-inline"></b-icon-arrow-up>
                        {{ walletTotal.totalIncomeAmount | money(wallet.defaultCurrency) }}
                    </span>
                </span>
                <span class="wallet-total wallet-total-small">
                    <span class="text-muted wallet-total-title">
                        {{ $t('wallets.expense') }}
                    </span>
                    <span class="text-danger wallet-total-value">
                        <b-icon-arrow-down variant="danger" scale="1" class="d-none d-sm-inline"></b-icon-arrow-down>
                        {{ walletTotal.totalExpenseAmount | money(wallet.defaultCurrency) }}
                    </span>
                </span>
            </div>

            <div class="wallet-tags list-ltr" v-show="tags.length">
                <tag v-for="tag of tags"
                     v-show="!isTagSelected(tag.id)"
                     :tag="tag"
                     :key="tag.id"
                     @selected="onTagSelected"
                ></tag>
                <div>
                    <b-button
                        v-show="totalPerTags.length"
                        variant="outline-secondary"
                        size="sm"
                        class="align-text-icon mt-3"
                        @click="onSelectedTagsClear"
                    >
                        {{ $t('wallets.clear') }}
                        <b-icon icon="x"></b-icon>
                    </b-button>
                </div>
            </div>

            <div class="wallet-tags-total">
                <div class="wallet-details justify-content-between align-items-end d-sm-flex block"
                       v-for="total of totalPerTags"
                       :key="total.tagId">
                    <div>
                        <tag :tag="total.tag" state="closable" @selected="onTagSelected"></tag>
                    </div>
                    <div class="tags-total-amounts text-left text-sm-right">
                        <span class="wallet-total wallet-total-small" v-if="total.hasIncome">
                            <span class="text-primary wallet-total-value">
                                <b-icon-arrow-up variant="primary" scale="1" class="d-none d-sm-inline"></b-icon-arrow-up>
                                {{ total.totalIncomeAmount | money(wallet.defaultCurrency) }}
                                <span class="wallet-total-value-percent">/ {{ total.incomePercent }}%</span>
                            </span>
                        </span>
                        <span class="wallet-total wallet-total-small" v-if="total.hasExpense">
                            <span class="text-danger wallet-total-value">
                                <b-icon-arrow-down variant="danger" scale="1" class="d-none d-sm-inline"></b-icon-arrow-down>
                                {{ total.totalExpenseAmount | money(wallet.defaultCurrency) }}
                                <span class="wallet-total-value-percent">/ {{ total.expensePercent }}%</span>
                            </span>
                        </span>
                        <span class="wallet-total wallet-total-small" v-if="!total.hasIncome && !total.hasExpense">
                            <span class="text-muted wallet-total-value">
                                {{ 0 | money(wallet.defaultCurrency) }}
                            </span>
                        </span>
                    </div>
                </div>
            </div>

            <div class="wallet-tools-ctrl">
                <b-button
                    v-b-toggle.wallet-chart
                    variant="outline-secondary"
                    size="sm"
                    class="mr-2"
                    :pressed="graphVisible"
                >
                    {{ $t('wallets.graph') }}
                    <b-icon icon="bar-chart-line-fill"></b-icon>
                </b-button>
                <b-button
                    v-b-toggle.wallet-charges-filter
                    variant="outline-secondary"
                    size="sm"
                    :pressed="filterVisible"
                >
                    {{ $t('wallets.filters') }}
                    <b-icon icon="funnel"></b-icon>
                </b-button>
            </div>

            <b-collapse id="wallet-chart" v-model="graphVisible">
                <div class="wallet-chart">
                    <div class="charge-loader-main d-flex justify-content-center align-items-center" v-if="isLoadingFor('chart') || hasLoadingFailedMessageFor('chart')">
                        <div class="d-flex align-items-center" v-if="isLoadingFor('chart')">
                            <b-spinner variant="light"></b-spinner>
                            <span class="loading-text ml-2">{{ $t('loadingData') }}</span>
                        </div>
                        <div class="d-flex align-items-center" v-if="hasLoadingFailedMessageFor('chart')">
                            <b-icon-exclamation-circle></b-icon-exclamation-circle>
                            <span class="loading-text ml-2">{{ getLoadingFailedMessageFor('chart') }}</span>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-8"></div>
                        <div class="col-md-4">
                            <b-input-group :prepend="$t('wallets.groupBy')" class="mb-4">
                                <b-form-select v-model="selectedGroupBy" :options="groupOptions"></b-form-select>
                            </b-input-group>
                        </div>
                    </div>
                    <charges-flow-chart
                        :currency="wallet.defaultCurrency"
                        :dataset="graphData"
                        :group="graphGroupBy"
                        :tags="selectedTags"
                    ></charges-flow-chart>
                </div>
            </b-collapse>

            <div class="wallet-charges">
                <b-collapse id="wallet-charges-filter" v-model="filterVisible">
                    <charges-filter @change="onFilterChanged"></charges-filter>
                </b-collapse>
                <charges-list
                    :wallet="wallet"
                    :filter="filter"
                    @created="onChargesListChanged"
                    @updated="onChargesListChanged"
                    @deleted="onChargesListChanged"
                    @moved="onChargesListChanged"
                    @tag-selected="onTagSelected"
                    @last-charge-removed="onLastChargeRemoved"
                ></charges-list>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Mixins } from 'vue-property-decorator'
import {
    emptyWallet,
    walletGet,
    walletUsersGet,
    walletDelete,
    walletActivate,
    walletDisable,
    walletArchive,
    walletUnArchive,
    walletTagsGet,
    WalletInterface
} from '@/api/wallets';
import { UserInterface } from '@/api/users';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import ProfileAvatarBadge from '@/components/profile/ProfileAvatarBadge.vue';
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue';
import ChargeItem from '@/components/wallets/ChargeItem.vue';
import ChargeCreate from '@/components/wallets/ChargeCreate.vue';
import ChargesList from "@/components/wallets/charges/ChargesList.vue";
import ChargesFilter, { FilterChangeEvent } from '@/components/wallets/charges/ChargesFilter.vue';
import ChargesFlowChart from '@/components/wallets/charges/ChargesFlowChart.vue';
import Tag from '@/components/tags/Tag.vue';
import Loader from '@/shared/Loader';
import { TagInterface } from '@/api/tags';
import { TagTotalInterface, TotalInterface, walletTotalGet } from '@/api/total';
import { GraphDataEntry, GROUP_BY_DAY, GROUP_BY_MONTH, GROUP_BY_YEAR, walletGraphGet } from '@/api/graph';
import { emptyFilterData, Filter, FilterDataInterface } from '@/api/filters';
import EmailIsNotConfirmedAlert from '@/components/profile/EmailIsNotConfirmedAlert.vue';
import WalletsActiveShortList from '@/components/wallets/WalletsActiveShortList.vue';

interface TagTotal extends TagTotalInterface {
    tag: TagInterface
    hasIncome: boolean
    hasExpense: boolean
    incomePercent: string
    expensePercent: string
}

@Component({
    components: {
        WalletsActiveShortList,
        EmailIsNotConfirmedAlert,
        ChargesList,
        ChargeCreate,
        ChargeItem,
        ProfileAvatar,
        ProfileAvatarBadge,
        WarningMessage,
        Tag,
        ChargesFilter,
        ChargesFlowChart,
    }
})
export default class WalletView extends Mixins(Loader) {
    @Prop()
    walletID!: number

    wallet: WalletInterface = emptyWallet()

    walletTotal: TotalInterface = {
        totalAmount: 0,
        totalIncomeAmount: 0,
        totalExpenseAmount: 0,
        currency: undefined,
        tags: undefined,
    }

    loadFailed = false

    users: Array<UserInterface> = []

    tags: Array<TagInterface> = []

    selectedTags: Array<TagInterface> = []

    filter: FilterDataInterface = emptyFilterData()

    graphData: Array<GraphDataEntry> = []

    selectedGroupBy = GROUP_BY_DAY
    graphGroupBy = GROUP_BY_DAY

    graphVisible = false

    filterVisible = false

    mounted() {
        this.onWalletIdChange()
    }

    get isEmailConfirmed(): boolean {
        return this.$store.state.isEmailConfirmed
    }

    get groupOptions() {
        return [
            {value: GROUP_BY_DAY, text: this.$t('wallets.groupByDay').toString()},
            {value: GROUP_BY_MONTH, text: this.$t('wallets.groupByMonth').toString()},
            {value: GROUP_BY_YEAR, text: this.$t('wallets.groupByYear').toString()},
        ]
    }

    get totalPerTags(): Array<TagTotal> {
        if (this.walletTotal.tags === undefined) {
            return []
        }

        const tagsTotal: Record<number, TagTotal> = {}

        for (const total of this.walletTotal.tags) {
            const tag = this.findTagById(total.tagId)
            if (tag === null) {
                continue
            }

            tagsTotal[total.tagId] = Object.assign(total, {
                tag: tag,
                hasIncome: total.totalIncomeAmount !== 0,
                hasExpense: total.totalExpenseAmount !== 0,
                incomePercent: ((total.totalIncomeAmount / this.walletTotal.totalIncomeAmount) * 100).toFixed(2),
                expensePercent: ((total.totalExpenseAmount / this.walletTotal.totalExpenseAmount) * 100).toFixed(2),
            })
        }

        const list = new Array<TagTotal>()

        for (const tag of this.selectedTags) {
            if (Object.prototype.hasOwnProperty.call(tagsTotal, tag.id)) {
                list.push(tagsTotal[tag.id])
                continue
            }

            list.push({
                tagId: tag.id,
                totalIncomeAmount: 0,
                totalExpenseAmount: 0,
                tag: tag,
                hasIncome: false,
                hasExpense: false,
                incomePercent: '0.00',
                expensePercent: '0.00',
            })
        }

        return list
    }

    private findTagById(id: number): TagInterface|null {
        for (const tag of this.tags) {
            if (tag.id === id) {
                return tag
            }
        }

        return null;
    }

    public isTagSelected(id: number): boolean {
        return this.selectedTags.map(tag => tag.id).indexOf(id) !== -1
    }

    @Watch('walletID')
    protected onWalletIdChange() {
        this.load()
        this.loadTotal()
        this.loadUsers()
        this.loadTags()
        this.loadChart()
    }

    @Watch('selectedTags')
    protected onSelectedTagsChange() {
        this.filter.tags = this.selectedTags.map(tag => tag.id).join(',')
        this.loadTotal()
        this.loadChart()
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
        walletTotalGet(this.walletID, Filter.createFromData(this.filter))
            .then(response => {
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
        })
    }

    public onChargesListChanged() {
        this.loadTotal()
        this.loadTags()
        this.loadChart()
        this.$store.dispatch('loadActiveWallets')
    }

    public onLastChargeRemoved() {
        this.$router.push({
            name: 'wallets.show',
            params: {
                'walletID': this.walletID.toString(),
            }
        })
    }

    public onDelete(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        walletDelete(this.walletID).then(() => {
            this.$store.dispatch('loadActiveWallets')
            this.$router.push({
                name: 'wallets'
            })
        }).catch(err => {
            console.log('Unable to delete wallet', err)
        })
    }

    public onActivate(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        walletActivate(this.walletID).then(() => {
            this.wallet.isActive = true
            this.$store.dispatch('loadActiveWallets')
        }).catch(err => {
            console.log('Unable to activate wallet', err)
        })
    }

    public onDisable(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        walletDisable(this.walletID).then(() => {
            this.wallet.isActive = false
            this.$store.dispatch('loadActiveWallets')
        }).catch(err => {
            console.log('Unable to disable wallet', err)
        })
    }

    public onArchive(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        walletArchive(this.walletID).then(() => {
            this.wallet.isArchived = true
            this.$store.dispatch('loadActiveWallets')
        }).catch(err => {
            console.log('Unable to archive wallet', err)
        })
    }

    public onUnArchive(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        walletUnArchive(this.walletID).then(() => {
            this.wallet.isArchived = false
            this.$store.dispatch('loadActiveWallets')
        }).catch(err => {
            console.log('Unable to un-archive wallet', err)
        })
    }

    public onTagSelected(tag: TagInterface) {
        const index = this.selectedTags.map(tag => tag.id).indexOf(tag.id)

        if (index === -1) {
            this.selectedTags.push(tag)
        } else {
            this.selectedTags.splice(index, 1)
        }
    }

    public onFilterChanged(event: FilterChangeEvent) {
        this.filter.dateFrom = event.dateFrom
        this.filter.dateTo = event.dateTo
        this.loadTotal()
        this.loadChart()
    }

    public onSelectedTagsClear() {
        this.selectedTags = []
    }

    @Watch('selectedGroupBy')
    @Watch('graphVisible')
    protected loadChart() {
        if (!this.graphVisible) {
            return
        }

        this.resetLoadingFailedMessageFor('chart')
        this.setLoadingFor('chart')

        const filter = Filter.createFromData(this.filter)
        filter.groupBy = this.selectedGroupBy;

        walletGraphGet(this.walletID, filter)
            .then(response => {
                this.graphData = response.data.data
                this.graphGroupBy = this.selectedGroupBy
            })
            .catch((error) => {
                this.setLoadingFailedMessageFor('chart', this.$t('wallets.chartLoadingError').toString())
                console.error(error)
            })
            .finally(() => {
                this.setLoadedFor('chart')
            })
    }
}
</script>

<style lang="scss">
@import "node_modules/bootstrap/scss/functions";
@import "node_modules/bootstrap/scss/variables";
@import "node_modules/bootstrap/scss/mixins/_breakpoints";

button.align-text-icon > svg {
    margin-bottom: -1px;
}

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

            .wallet-total-value-percent {
                font-size: 12px;
            }
        }

        &.wallet-total-small {
            .wallet-total-value {
                font-size: 20px;
                line-height: 20px;
            }
        }
    }
}

.wallet-tags-total .wallet-details {
    border-top: none;
}

.wallet-tags {
    padding: 20px 0 15px;
    border-bottom: 1px solid #eee;

    .wallet-tags-label {
        font-size: 12px;
    }
}

.wallet-tools-ctrl {
    padding: 15px 0 15px;
    border-bottom: 1px solid #eee;
}

.wallet-chart {
    position: relative;
    border-bottom: 1px solid #eee;
    padding: 20px 0;

    .charge-loader-main {
        margin: -20px 0;
        height: 100%;
        position: absolute;
        width: 100%;
        background: rgb(255 255 255 / 77%);
        z-index: 100;
        cursor: wait;
        backdrop-filter: blur(3px);

        .spinner-border {
            color: #d4d4d4 !important;
        }

        .loading-text {
            color: #a9a9a9;
        }
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

    .wallet-tags-total .wallet-details .tags-total-amounts {
        padding-top: 15px;

        &>span:first-child {
            margin-left: 0;
        }
    }
}
</style>
