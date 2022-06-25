<template>
    <div class="wallet">
        <warning-message message="Unable to load tag. Please try again later" :show="loadFailed"></warning-message>

        <div v-if="tag !== null">
            <div class="wallet-header d-flex justify-content-center">
                <tag :tag="tag"></tag>
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
                <span class="wallet-total" :class="{'wallet-total-small': isIncomeGreaterThanExpense}" v-if="hasExpense">
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
                <charges-list :tag="tag"></charges-list>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import WarningMessage from '@/components/shared/WarningMessage.vue';
import ProfileAvatarBadge from '@/components/profile/ProfileAvatarBadge.vue';
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue';
import ChargeItem from '@/components/wallets/ChargeItem.vue';
import ChargeCreate from '@/components/wallets/ChargeCreate.vue';
import ChargesList from "@/components/wallets/charges/ChargesList.vue";
import Tag from '@/components/tags/Tag.vue';
import { TagInterface, tagsGetCommon } from '@/api/tags';
import { tagTotalGet, TotalInterface } from '@/api/total';

@Component({
    components: {ChargesList, ChargeCreate, ChargeItem, ProfileAvatar, ProfileAvatarBadge, WarningMessage, Tag}
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

    tag: TagInterface|null = null

    mounted() {
        this.load()
        this.loadTotal()
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

    protected load() {
        this.loadFailed = false;

        tagsGetCommon().then(response => {
            const tagID = this.tagIDParsed;

            for (const tag of response.data.data) {
                if (tag.id !== tagID) {
                    continue
                }

                this.tag = tag
            }

            if (this.tag === null) {
                this.loadFailed = true;
            }
        }).catch(() => {
            this.loadFailed = true;
        })
    }

    protected loadTotal() {
        tagTotalGet(this.tagIDParsed).then(response => {
            this.total = response.data.data
        }).catch(() => {
            this.loadFailed = true;
        })
    }
}
</script>

<style lang="scss" scoped>

</style>
