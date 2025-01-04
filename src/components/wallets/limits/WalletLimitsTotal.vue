<template>
    <div class="wallet-limit" v-if="hasExpense">
        <div class="justify-content-between align-items-end d-sm-flex block">
            <div>
                {{ $t('limits.total') }}
            </div>
            <div>
                <div class="wallet-limit-total-container text-left text-sm-right">
                    <span class="wallet-limit-total" v-if="hasExpense">
                        <span class="text-danger wallet-limit-total-value">
                            <b-icon-arrow-down variant="danger" scale="1" class="d-none d-sm-inline"></b-icon-arrow-down>
                            {{ totalExpenseAmount | money(wallet.defaultCurrency) }}
                            <span class="limit-value">/ {{ totalExpenseLimitAmount | money(wallet.defaultCurrency) }}</span>
                        </span>
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { WalletInterface } from '@/api/wallets';

@Component({
    components: {}
})
export default class WalletLimitsTotal extends Vue {
    @Prop()
    wallet!: WalletInterface

    @Prop()
    totalExpenseAmount!: number

    @Prop()
    totalExpenseLimitAmount!: number

    get hasExpense(): boolean {
        return this.totalExpenseLimitAmount > 0
    }
}
</script>

<style lang="scss" scoped>
.wallet-limit {
    padding: 22px 0 14px;
    border-top: 1px #eee solid;
    margin-top: 5px;
    cursor: auto;
}
</style>
