<template>
    <b-card no-body :border-variant="isIncome ? 'success' : 'danger'" class="mb-4">
        <b-card-body>
            <b-card-title class="mb-0 d-flex justify-content-between align-items-center">
                {{ isIncome ? 'Income' : 'Expense' }}

                <b-icon-arrow-up variant="success" scale="1" class="d-none d-sm-inline" v-if="isIncome"></b-icon-arrow-up>
                <b-icon-arrow-down variant="danger" scale="1" class="d-none d-sm-inline" v-if="isExpense"></b-icon-arrow-down>
            </b-card-title>
        </b-card-body>

        <b-list-group flush>
            <b-list-group-item class="d-flex justify-content-between align-items-center text-secondary">
                All time:
                <b-spinner v-show="isLoading" small></b-spinner>
                <span
                    v-if="!isLoading"
                    class="font-weight-bold"
                    :class="{'text-success': isIncome, 'text-danger': isExpense}"
                >
                    {{ stats.total | money(currency) }}
                </span>
            </b-list-group-item>
            <b-list-group-item class="d-flex justify-content-between align-items-center text-secondary">
                Year:
                <b-spinner v-show="isLoading" small></b-spinner>
                <span
                    v-if="!isLoading"
                    class="font-weight-bold"
                    :class="{'text-success': isIncome, 'text-danger': isExpense}"
                >
                    {{ stats.lastYear | money(currency) }}
                </span>
            </b-list-group-item>
            <b-list-group-item class="d-flex justify-content-between align-items-center text-secondary">
                Quarter:
                <b-spinner v-show="isLoading" small></b-spinner>
                <span
                    v-if="!isLoading"
                    class="font-weight-bold"
                    :class="{'text-success': isIncome, 'text-danger': isExpense}"
                >
                    {{ stats.lastQuarter | money(currency) }}
                </span>
            </b-list-group-item>
            <b-list-group-item class="d-flex justify-content-between align-items-center text-secondary">
                Month:
                <b-spinner v-show="isLoading" small></b-spinner>
                <span
                    v-if="!isLoading"
                    class="font-weight-bold"
                    :class="{'text-success': isIncome, 'text-danger': isExpense}"
                >
                    {{ stats.lastMonth | money(currency) }}
                </span>
            </b-list-group-item>
        </b-list-group>
    </b-card>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { ChargesFlowTypeStatisticsInterface } from '@/api/profile/profile';
import { TypeExpense, TypeIncome } from '@/api/charges';
import { CurrencyInterface } from '@/api/currency';

@Component
export default class ChargesStatsCard extends Vue {
    @Prop({
        required: true,
        validator(value: never): boolean {
            return value === TypeIncome || value === TypeExpense;
        }
    })
    type!: string;

    @Prop({required: true})
    currency!: CurrencyInterface

    @Prop({required: true})
    stats!: ChargesFlowTypeStatisticsInterface

    get isLoading(): boolean {
        return this.stats === null;
    }

    get isIncome(): boolean {
        return this.type === TypeIncome;
    }

    get isExpense(): boolean {
        return this.type === TypeExpense;
    }
}
</script>

<style lang="scss" scoped>

</style>
