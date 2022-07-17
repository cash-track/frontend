<template>
    <div class="wallet">
        <warning-message message="Unable to load tag. Please try again later" :show="loadFailed"></warning-message>

        <div v-if="tag !== null">
            <div class="wallet-header d-flex justify-content-between">
                <h3>
                    Analyse tags usage
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

            <div class="wallet-details d-flex justify-content-center align-items-end" v-if="total.currency !== null">
                <span class="wallet-total" :class="{'wallet-total-small': !isIncomeGreaterThanExpense}" v-if="hasIncome && isIncomeGreaterThanExpense">
                    <span class="text-muted wallet-total-title">
                        Income
                    </span>
                    <span class="text-primary wallet-total-value">
                        <b-icon-arrow-up variant="primary" scale="1" class="d-none d-sm-inline"></b-icon-arrow-up>
                        {{ total.totalIncomeAmount | money(total.currency) }}
                    </span>
                </span>
                <span class="wallet-total" :class="{'wallet-total-small': isIncomeGreaterThanExpense}" v-if="hasExpense || !hasIncome">
                    <span class="text-muted wallet-total-title">Expense</span>
                    <span class="text-danger wallet-total-value">
                        <b-icon-arrow-down variant="danger" scale="1" class="d-none d-sm-inline"></b-icon-arrow-down>
                        {{ total.totalExpenseAmount | money(total.currency) }}
                    </span>
                </span>
                <span class="wallet-total wallet-total-small" v-if="hasIncome && !isIncomeGreaterThanExpense">
                    <span class="text-muted wallet-total-title">
                        Income
                    </span>
                    <span class="text-primary wallet-total-value">
                        <b-icon-arrow-up variant="primary" scale="1" class="d-none d-sm-inline"></b-icon-arrow-up>
                        {{ total.totalIncomeAmount | money(total.currency) }}
                    </span>
                </span>
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
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import WarningMessage from '@/components/shared/WarningMessage.vue';
import ProfileAvatarBadge from '@/components/profile/ProfileAvatarBadge.vue';
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue';
import ChargeItem from '@/components/wallets/ChargeItem.vue';
import ChargeCreate from '@/components/wallets/ChargeCreate.vue';
import ChargesList from "@/components/wallets/charges/ChargesList.vue";
import ChargesFilter, { FilterChangeEvent } from '@/components/wallets/charges/ChargesFilter.vue';
import Tag from '@/components/tags/Tag.vue';
import { TagInterface, tagsGetCommon } from '@/api/tags';
import { tagTotalGet, TotalInterface } from '@/api/total';
import { Filter, FilterDataInterface } from '@/api/filters';

@Component({
    components: {
        ChargesList,
        ChargeCreate,
        ChargeItem,
        ChargesFilter,
        ProfileAvatar,
        ProfileAvatarBadge,
        WarningMessage,
        Tag,
    }
})
export default class TagView extends Vue {
    @Prop()
    tagID!: string

    total: TotalInterface = {
        totalAmount: 0,
        totalIncomeAmount: 0,
        totalExpenseAmount: 0,
        currency: null,
    }

    loadFailed = false

    filter: FilterDataInterface = {
        dateFrom: '',
        dateTo: '',
    }

    tag: TagInterface|null = null

    tags: Array<TagInterface> = []

    mounted() {
        this.loadTags()
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

    protected onTagSelected(tag: TagInterface) {
        this.$router.push({
            name: 'tags.show',
            params: {
                'tagID': tag.id.toString(),
            }
        })
    }

    protected onChargeUpdated() {
        this.loadTotal()
    }

    protected onChargeDeleted() {
        this.loadTotal()
    }

    protected onFilterChanged(event: FilterChangeEvent) {
        this.filter.dateFrom = event.dateFrom
        this.filter.dateTo = event.dateTo
        this.loadTotal()
    }
}
</script>

<style lang="scss" scoped>
.wallet-tags {
    border-top: 1px solid #eee;
    border-bottom: none;
}
</style>
