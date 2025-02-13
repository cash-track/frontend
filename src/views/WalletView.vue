<template>
    <div class="wallet">
        <wallets-active-short-list class="mb-4"></wallets-active-short-list>

        <email-is-not-confirmed-alert></email-is-not-confirmed-alert>

        <warning-message :message="$t('wallets.loadingError')" :show="loadFailed"></warning-message>

        <div v-if="wallet.id">
            <div>
                <b-badge variant="primary" v-if="wallet.isActive">{{ $t('wallets.active') }}</b-badge>
                <b-badge variant="secondary" v-if="wallet.isArchived">{{ $t('wallets.archived') }}</b-badge>
            </div>
            <div class="wallet-header d-flex justify-content-between">
                <h3>{{ wallet.name }}</h3>

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

                            <b-dropdown-item variant="danger" @click="onDelete" :disabled="!isEmailConfirmed">{{ $t('wallets.delete') }}</b-dropdown-item>
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

            <div class="wallet-tools-ctrl">
                <b-button
                    v-b-toggle.wallet-tags
                    variant="outline-secondary"
                    size="sm"
                    class="mr-2"
                    :pressed="tagsVisible"
                    :disabled="!tags.length"
                >
                    {{ $t('wallets.tags') }}
                    <b-icon icon="tags-fill"></b-icon>
                </b-button>
                <b-button
                    v-b-toggle.wallet-limits
                    variant="outline-secondary"
                    size="sm"
                    class="mr-2"
                    :pressed="limitsVisible"
                >
                    {{ $t('wallets.limits') }}
                    <b-icon icon="sliders"></b-icon>
                </b-button>
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

            <b-collapse id="wallet-tags" v-model="tagsVisible">
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
            </b-collapse>

            <b-collapse id="wallet-limits" v-model="limitsVisible">
                <div class="wallet-limits">
                    <div class="wallet-limits-list">
                        <wallet-limit-item v-for="walletLimit of limits"
                                           :key="walletLimit.limit.id"
                                           :wallet-limit="walletLimit"
                                           :wallet="wallet"
                                           @updated="onLimitsListChanged"
                                           @deleted="onLimitsListChanged"
                        />
                    </div>
                    <div class="wallet-limits-total">
                        <wallet-limits-total :wallet="wallet" :total-expense-amount="totalExpenseAmount" :total-expense-limit-amount="totalExpenseLimitAmount"></wallet-limits-total>
                    </div>
                    <div class="wallet-limits-create">
                        <b-button variant="outline-primary" size="sm" class="mt-2 mr-2 mb-2" v-b-toggle.wallet-limit-create>
                            {{ $t('limits.createLimit') }}
                        </b-button>

                        <b-dropdown variant="outline-primary"
                                    size="sm"
                                    class="mt-2 mb-2"
                                    v-if="limits.length === 0 && walletsHasLimits.length > 0"
                        >
                            <template #button-content>
                                {{ $t('limits.copyFrom') }}
                                <b-spinner small v-show="isLoadingFor('walletsHasLimits')"></b-spinner>
                            </template>
                            <b-dropdown-item-button
                                :key="wallet.id"
                                v-for="wallet of walletsHasLimits"
                                :disabled="isLoadingFor('walletsHasLimits')"
                                @click="onWalletLimitsCopy(wallet)"
                            >
                                {{ wallet.name }}
                            </b-dropdown-item-button>
                        </b-dropdown>

                        <b-collapse id="wallet-limit-create">
                            <div class="wallet-limit-create">
                                <limit-form :wallet="wallet" @created="onLimitCreated" @cancelled="onLimitCreateCancelled"/>
                            </div>
                        </b-collapse>
                    </div>
                </div>
            </b-collapse>

            <b-collapse id="wallet-chart" v-model="graphVisible">
                <div class="wallet-chart">
                    <div class="charge-loader-main d-flex justify-content-center align-items-center" v-if="isLoadingFor('amountChart') || hasLoadingFailedMessageFor('amountChart')">
                        <div class="d-flex align-items-center" v-if="isLoadingFor('amountChart')">
                            <b-spinner variant="light"></b-spinner>
                            <span class="loading-text ml-2">{{ $t('loadingData') }}</span>
                        </div>
                        <div class="d-flex align-items-center" v-if="hasLoadingFailedMessageFor('amountChart')">
                            <b-icon-exclamation-circle></b-icon-exclamation-circle>
                            <span class="loading-text ml-2">{{ getLoadingFailedMessageFor('amountChart') }}</span>
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

                <div class="wallet-chart">
                    <div class="charge-loader-main d-flex justify-content-center align-items-center" v-if="isLoadingFor('totalChart') || hasLoadingFailedMessageFor('totalChart')">
                        <div class="d-flex align-items-center" v-if="isLoadingFor('totalChart')">
                            <b-spinner variant="light"></b-spinner>
                            <span class="loading-text ml-2">{{ $t('loadingData') }}</span>
                        </div>
                        <div class="d-flex align-items-center" v-if="hasLoadingFailedMessageFor('totalChart')">
                            <b-icon-exclamation-circle></b-icon-exclamation-circle>
                            <span class="loading-text ml-2">{{ getLoadingFailedMessageFor('totalChart') }}</span>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <h4>
                                <b-icon-arrow-down variant="danger" scale="1"></b-icon-arrow-down>
                                {{ $t('wallets.expense') }}
                            </h4>
                            <charges-total-chart
                                :currency="wallet.defaultCurrency"
                                charge-type="-"
                                :tags-filtered="selectedTags"
                                :tags="tags"
                                :dataset="totalExpenseGraphData"
                            ></charges-total-chart>
                        </div>
                        <div class="col-md-6">
                            <h4>
                                <b-icon-arrow-up variant="primary" scale="1"></b-icon-arrow-up>
                                {{ $t('wallets.income') }}
                            </h4>
                            <charges-total-chart
                                :currency="wallet.defaultCurrency"
                                charge-type="+"
                                :tags-filtered="selectedTags"
                                :tags="tags"
                                :dataset="totalIncomeGraphData"
                            ></charges-total-chart>
                        </div>
                    </div>
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
    WalletInterface,
    WalletsRepositoryInterface,
    WalletsRepository,
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
import ChargesTotalChart from '@/components/wallets/charges/ChargesTotalChart.vue';
import Tag from '@/components/tags/Tag.vue';
import Loader from '@/shared/Loader';
import { TagInterface } from '@/api/tags';
import {
    TagTotalInterface,
    TotalInterface,
    TotalRepository,
    TotalRepositoryInterface
} from '@/api/total';
import {
    AmountGraphDataEntry,
    GraphRepository,
    GraphRepositoryInterface,
    GROUP_BY_DAY,
    GROUP_BY_MONTH,
    GROUP_BY_YEAR, TotalGraphDataEntry
} from '@/api/graph';
import {
    emptyFilterData,
    Filter,
    FILTER_CHARGE_TYPE_EXPENSE,
    FILTER_CHARGE_TYPE_INCOME,
    FilterDataInterface
} from '@/api/filters';
import EmailIsNotConfirmedAlert from '@/components/profile/EmailIsNotConfirmedAlert.vue';
import WalletsActiveShortList from '@/components/wallets/WalletsActiveShortList.vue';
import {
    LimitsRepository,
    LimitsRepositoryInterface,
    WalletLimitInterface
} from '@/api/limits';
import LimitForm from '@/components/wallets/limits/LimitForm.vue';
import WalletLimitItem from '@/components/wallets/limits/WalletLimitItem.vue';
import WalletLimitsTotal from '@/components/wallets/limits/WalletLimitsTotal.vue';

interface TagTotal extends TagTotalInterface {
    tag: TagInterface
    hasIncome: boolean
    hasExpense: boolean
    incomePercent: string
    expensePercent: string
}

@Component({
    components: {
        WalletLimitItem,
        WalletLimitsTotal,
        LimitForm,
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
        ChargesTotalChart,
    }
})
export default class WalletView extends Mixins(Loader) {
    @Prop()
    walletID!: number

    walletsRepository: WalletsRepositoryInterface = new WalletsRepository()
    graphRepository: GraphRepositoryInterface = new GraphRepository()
    limitsRepository: LimitsRepositoryInterface = new LimitsRepository()
    totalRepository: TotalRepositoryInterface = new TotalRepository()

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

    limits: Array<WalletLimitInterface> = []

    walletsHasLimits: Array<WalletInterface> = []

    filter: FilterDataInterface = emptyFilterData()

    graphData: Array<AmountGraphDataEntry> = []
    totalIncomeGraphData: Array<TotalGraphDataEntry> = []
    totalExpenseGraphData: Array<TotalGraphDataEntry> = []

    selectedGroupBy = GROUP_BY_DAY
    graphGroupBy = GROUP_BY_DAY

    tagsVisible = false

    limitsVisible = false

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

    get totalExpenseAmount(): number {
        return this.limits.map(limit => limit.limit.amount).reduce((sum, value) => sum + value, 0)
    }

    get totalExpenseLimitAmount(): number {
        return this.limits.map(limit => limit.amount).reduce((sum, value) => sum + value, 0)
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
        this.loadLimits()
        this.loadAmountChart()
        this.loadTotalChart()
    }

    @Watch('selectedTags')
    protected onSelectedTagsChange() {
        this.filter.tags = this.selectedTags.map(tag => tag.id).join(',')
        this.loadTotal()
        this.loadAmountChart()
        this.loadTotalChart()
    }

    protected load() {
        this.loadFailed = false;

        this.walletsRepository.get(this.walletID).then(response => {
            this.wallet = response.data.data
        }).catch(() => {
            this.loadFailed = true;
        })
    }

    protected loadTotal() {
        this.totalRepository.getWalletTotal(this.walletID, Filter.createFromData(this.filter))
            .then(response => {
                this.walletTotal = response.data.data
            }).catch(() => {
                this.loadFailed = true;
            })
    }

    protected loadUsers() {
        this.walletsRepository.getUsers(this.walletID).then(response => {
            this.users = response.data.data
        }).catch(() => {
            this.loadFailed = true;
        })
    }

    protected loadTags() {
        this.selectedTags = []
        this.walletsRepository.getTags(this.walletID).then(response => {
            this.tags = response.data.data
        })
    }

    protected loadLimits() {
       this.limitsRepository.get(this.walletID).then(response => {
            this.limits = response.data.data

            if (this.limits.length === 0) {
                this.loadWalletsHasLimits(false)
            }
        })
    }

    protected loadWalletsHasLimits(archived: boolean) {
        this.setLoadingFor('walletsHasLimits')

        this.walletsRepository.getHasLimits(archived).then(response => {
            this.walletsHasLimits = response.data.data

            if (!archived && this.walletsHasLimits.length === 0) {
                this.loadWalletsHasLimits(true)
            }
        }).finally(() => {
            this.setLoadedFor('walletsHasLimits')
        })
    }

    public onChargesListChanged() {
        this.loadTotal()
        this.loadTags()
        this.loadLimits()
        this.loadAmountChart()
        this.loadTotalChart()
        this.$store.dispatch('loadActiveWallets')
    }

    public onLimitCreateCancelled() {
        this.$root.$emit('bv::toggle::collapse', 'wallet-limit-create')
    }

    public onLimitCreated() {
        this.$root.$emit('bv::toggle::collapse', 'wallet-limit-create')
        this.onLimitsListChanged()
    }

    public onLimitsListChanged() {
        this.loadLimits()
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

        if (! confirm(this.$t('wallets.deletingConfirm').toString())) {
            return
        }

        this.walletsRepository.delete(this.walletID).then(() => {
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

        this.walletsRepository.activate(this.walletID).then(() => {
            this.wallet.isActive = true
            this.$store.dispatch('loadActiveWallets')
        }).catch(err => {
            console.log('Unable to activate wallet', err)
        })
    }

    public onDisable(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.walletsRepository.disable(this.walletID).then(() => {
            this.wallet.isActive = false
            this.$store.dispatch('loadActiveWallets')
        }).catch(err => {
            console.log('Unable to disable wallet', err)
        })
    }

    public onArchive(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.walletsRepository.archive(this.walletID).then(() => {
            this.wallet.isArchived = true
            this.$store.dispatch('loadActiveWallets')
        }).catch(err => {
            console.log('Unable to archive wallet', err)
        })
    }

    public onUnArchive(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.walletsRepository.unArchive(this.walletID).then(() => {
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
        this.loadAmountChart()
        this.loadTotalChart()
    }

    public onSelectedTagsClear() {
        this.selectedTags = []
    }

    @Watch('selectedGroupBy')
    @Watch('graphVisible')
    protected loadAmountChart() {
        if (!this.graphVisible) {
            return
        }

        this.resetLoadingFailedMessageFor('amountChart')
        this.setLoadingFor('amountChart')

        const filter = Filter.createFromData(this.filter)
        filter.groupBy = this.selectedGroupBy;

        this.graphRepository.getWalletGraphAmount(this.walletID, filter)
            .then(response => {
                this.graphData = response.data.data
                this.graphGroupBy = this.selectedGroupBy
            })
            .catch((error) => {
                this.setLoadingFailedMessageFor('amountChart', this.$t('wallets.chartLoadingError').toString())
                console.error(error)
            })
            .finally(() => {
                this.setLoadedFor('amountChart')
            })
    }

    @Watch('graphVisible')
    protected loadTotalChart() {
        if (!this.graphVisible) {
            return
        }

        this.resetLoadingFailedMessageFor('totalChart')
        this.setLoadingFor('totalChart')

        const incomeFilter = Filter.createFromData(this.filter, FILTER_CHARGE_TYPE_INCOME)
        const expenseFilter = Filter.createFromData(this.filter, FILTER_CHARGE_TYPE_EXPENSE)

        const incomePromise = this.graphRepository.getWalletGraphTotal(this.walletID, incomeFilter)
            .then(response => {
                this.totalIncomeGraphData = response.data.data
            })
            .catch((error) => {
                this.setLoadingFailedMessageFor('totalChart', this.$t('wallets.chartLoadingError').toString())
                console.error(error)
            })

        const expensePromise = this.graphRepository.getWalletGraphTotal(this.walletID, expenseFilter)
            .then(response => {
                this.totalExpenseGraphData = response.data.data
            })
            .catch((error) => {
                this.setLoadingFailedMessageFor('totalChart', this.$t('wallets.chartLoadingError').toString())
                console.error(error)
            })

        Promise.all([
            incomePromise,
            expensePromise
        ]).finally(() => {
            this.setLoadedFor('totalChart')
        })
    }

    public onWalletLimitsCopy(sourceWallet: WalletInterface) {
        this.limitsRepository.copy(this.wallet.id, sourceWallet.id).then(response => {
            this.limits = response.data.data
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

.wallet-limits {
    padding: 7px 0;
    border-bottom: 1px solid #eee;

    .wallet-limit-create {
        padding: 25px 0;
        border-top: 1px solid #eee;
        margin-top: 7px;
    }
}

.wallet-tools-ctrl {
    padding: 15px 0 7px;
    border-bottom: 1px solid #eee;

    button {
        margin-bottom: 8px;
    }
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
