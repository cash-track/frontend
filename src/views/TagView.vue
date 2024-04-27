<template>
    <div class="wallet">
        <wallets-active-short-list class="mb-4"></wallets-active-short-list>

        <warning-message :message="$t('tags.statsLoadingError')" :show="loadFailed"></warning-message>

        <div v-if="tag !== null">
            <div class="wallet-header d-flex justify-content-between">
                <h3>
                    {{ $t('tags.stats') }}
                </h3>
            </div>

            <div class="wallet-tags list-ltr" v-show="tags.length">
                <tag v-for="item of tags"
                     :tag="item"
                     :key="item.id"
                     @selected="onTagSelected"
                     :active="item.id === tagIDParsed"
                ></tag>
            </div>

            <div class="wallet-details d-flex justify-content-center align-items-end" v-if="total.currency !== undefined">
                <span class="wallet-total" :class="{'wallet-total-small': !isIncomeGreaterThanExpense}" v-if="hasIncome && isIncomeGreaterThanExpense">
                    <span class="text-muted wallet-total-title">
                        {{ $t('wallets.income') }}
                    </span>
                    <span class="text-primary wallet-total-value">
                        <b-icon-arrow-up variant="primary" scale="1" class="d-none d-sm-inline"></b-icon-arrow-up>
                        {{ total.totalIncomeAmount | money(total.currency) }}
                    </span>
                </span>
                <span class="wallet-total" :class="{'wallet-total-small': isIncomeGreaterThanExpense}" v-if="hasExpense || !hasIncome">
                    <span class="text-muted wallet-total-title">
                        {{ $t('wallets.expense') }}
                    </span>
                    <span class="text-danger wallet-total-value">
                        <b-icon-arrow-down variant="danger" scale="1" class="d-none d-sm-inline"></b-icon-arrow-down>
                        {{ total.totalExpenseAmount | money(total.currency) }}
                    </span>
                </span>
                <span class="wallet-total wallet-total-small" v-if="hasIncome && !isIncomeGreaterThanExpense">
                    <span class="text-muted wallet-total-title">
                        {{ $t('wallets.income') }}
                    </span>
                    <span class="text-primary wallet-total-value">
                        <b-icon-arrow-up variant="primary" scale="1" class="d-none d-sm-inline"></b-icon-arrow-up>
                        {{ total.totalIncomeAmount | money(total.currency) }}
                    </span>
                </span>
            </div>

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
                <charges-flow-chart :currency="total.currency" :dataset="graphData" :group="graphGroupBy"></charges-flow-chart>
            </div>

            <div class="wallet-charges">
                <charges-filter @change="onFilterChanged"></charges-filter>
                <charges-list :tag="tag"
                              :filter="filter"
                              @updated="onChargeUpdated"
                              @deleted="onChargeDeleted"
                              @tag-selected="onTagSelected"
                ></charges-list>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Mixins } from 'vue-property-decorator'
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
import { TagInterface, tagsGetCommon } from '@/api/tags';
import { tagTotalGet, TotalInterface } from '@/api/total';
import { emptyFilterData, Filter, FilterDataInterface } from '@/api/filters';
import { GraphDataEntry, GROUP_BY_DAY, GROUP_BY_MONTH, GROUP_BY_YEAR, tagGraphGet } from '@/api/graph';
import WalletsActiveShortList from '@/components/wallets/WalletsActiveShortList.vue';

@Component({
    components: {
        WalletsActiveShortList,
        ChargesList,
        ChargeCreate,
        ChargeItem,
        ChargesFilter,
        ChargesFlowChart,
        ProfileAvatar,
        ProfileAvatarBadge,
        WarningMessage,
        Tag,
    }
})
export default class TagView extends Mixins(Loader) {
    @Prop()
    tagID!: string

    total: TotalInterface = {
        totalAmount: 0,
        totalIncomeAmount: 0,
        totalExpenseAmount: 0,
        currency: undefined,
        tags: undefined,
    }

    loadFailed = false

    filter: FilterDataInterface = emptyFilterData()

    tag: TagInterface|null = null

    tags: Array<TagInterface> = []

    graphData: Array<GraphDataEntry> = []

    selectedGroupBy = GROUP_BY_MONTH
    graphGroupBy = GROUP_BY_MONTH

    mounted() {
        this.loadTags()
    }

    get groupOptions() {
        return [
            {value: GROUP_BY_DAY, text: this.$t('wallets.groupByDay').toString()},
            {value: GROUP_BY_MONTH, text: this.$t('wallets.groupByMonth').toString()},
            {value: GROUP_BY_YEAR, text: this.$t('wallets.groupByYear').toString()},
        ]
    }

    get tagIDParsed(): number {
        return parseInt(this.tagID, 10)
    }

    get isIncomeGreaterThanExpense(): boolean {
        return this.total.totalIncomeAmount > this.total.totalExpenseAmount
    }

    get hasIncome(): boolean {
        return this.total.totalIncomeAmount !== 0
    }

    get hasExpense(): boolean {
        return this.total.totalExpenseAmount !== 0
    }

    protected loadTags() {
        this.loadFailed = false;

        tagsGetCommon().then(response => {
            this.tags = response.data.data
            this.onTagChange();
        }).catch(() => {
            this.loadFailed = true;
        })
    }

    @Watch('tagID')
    protected onTagChange() {
        if (this.tagIDParsed === 0) {
            return
        }

        for(const tag of this.tags) {
            if (tag.id === this.tagIDParsed) {
                this.tag = tag
            }
        }

        if (this.tag === null) {
            this.loadFailed = true;
            return
        }

        this.loadTotal()
        this.loadChart()
    }

    protected loadTotal() {
        if (this.tagIDParsed === 0) {
            return
        }

        tagTotalGet(this.tagIDParsed, Filter.createFromData(this.filter)).then(response => {
            this.total = response.data.data
        }).catch(() => {
            this.loadFailed = true;
        })
    }

    @Watch('selectedGroupBy')
    protected loadChart() {
        if (this.tagIDParsed === 0) {
            return
        }

        this.resetLoadingFailedMessageFor('chart')
        this.setLoadingFor('chart')

        const filter = Filter.createFromData(this.filter)
        filter.groupBy = this.selectedGroupBy

        tagGraphGet(this.tagIDParsed, filter).then(response => {
            this.graphData = response.data.data
            this.graphGroupBy = this.selectedGroupBy
        }).catch((error) => {
            this.setLoadingFailedMessageFor('chart', this.$t('wallets.chartLoadingError').toString())
            console.error(error)
        }).finally(() => {
            this.setLoadedFor('chart')
        })
    }

    public onTagSelected(tag: TagInterface) {
        this.$router.push({
            name: 'tags.show',
            params: {
                'tagID': tag.id.toString(),
            }
        })
    }

    public onChargeUpdated() {
        this.loadTotal()
        this.loadChart()
    }

    public onChargeDeleted() {
        this.loadTotal()
        this.loadChart()
    }

    public onFilterChanged(event: FilterChangeEvent) {
        this.filter.dateFrom = event.dateFrom
        this.filter.dateTo = event.dateTo
        this.loadTotal()
        this.loadChart()
    }
}
</script>

<style lang="scss" scoped>
.wallet-tags {
    border-top: 1px solid #eee;
    border-bottom: none;
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
</style>
