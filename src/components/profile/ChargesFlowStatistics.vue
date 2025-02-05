<template>
    <b-row>
        <b-col md="12" v-if="loadFailed">
            <warning-message :message="$t('profile.chargesFlowLoadingError')" :show="loadFailed"></warning-message>
        </b-col>
        <b-col md="6" v-if="!loadFailed">
            <charges-stats-card :type="typeIncomeID" :stats="incomeStatistics" :currency="currency"></charges-stats-card>
        </b-col>
        <b-col md="6" v-if="!loadFailed">
            <charges-stats-card :type="typeExpenseID" :stats="expenseStatistics" :currency="currency"></charges-stats-card>
        </b-col>
        <b-col md="12">
            <b-alert show variant="secondary">
                <b-icon-info-circle></b-icon-info-circle>
                {{ $t('profile.chargesFlowNotice') }}
            </b-alert>
        </b-col>
    </b-row>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import ChargesStatsCard from '@/components/profile/ChargesStatsCard.vue';
import {
    ChargesFlowStatisticsResponseInterface,
    ChargesFlowTypeStatisticsInterface,
    ProfileRepository,
    ProfileRepositoryInterface
} from '@/api/profile/profile';
import { TypeIncome, TypeExpense } from '@/api/charges';
import { CurrencyInterface } from '@/api/currency';
import WarningMessage from '@/components/shared/WarningMessage.vue';

@Component({
    components: {WarningMessage, ChargesStatsCard}
})
export default class ChargesFlowStatistics extends Vue {
    repository: ProfileRepositoryInterface = new ProfileRepository()

    incomeStatistics: ChargesFlowTypeStatisticsInterface|null = null;
    expenseStatistics: ChargesFlowTypeStatisticsInterface|null = null;
    currency: CurrencyInterface|null = null;

    loadFailed = false

    mounted() {
        this.load();
    }

    get typeIncomeID(): string {
        return TypeIncome;
    }

    get typeExpenseID(): string {
        return TypeExpense;
    }

    protected load() {
        this.loadFailed = false;

        this.repository.getStatisticsChargesFlow()
            .then(response => {
                this.onLoaded(response.data);

                return response;
            })
            .catch(this.onError);
    }

    protected onLoaded(response: ChargesFlowStatisticsResponseInterface) {
        this.incomeStatistics = response.data[TypeIncome];
        this.expenseStatistics = response.data[TypeExpense];
        this.currency = response.data.currency;
    }

    protected onError() {
        this.loadFailed = true;
    }
}
</script>

<style lang="scss" scoped>

</style>
