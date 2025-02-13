<template>
    <div>
        <h6>{{ $t('profile.counters') }}</h6>
        <b-list-group>
            <b-list-group-item class="text-secondary">
                <b-spinner v-if="!loadFailed && isLoading" small></b-spinner>

                <div v-if="!loadFailed && !isLoading"
                     class="d-flex justify-content-around"
                >
                    <div class="counter-item" :title="$t('profile.totalWalletsAmount')" v-b-tooltip.top>
                        <b-icon-wallet></b-icon-wallet>
                        <span>{{ counters.wallets }}</span>
                    </div>
                    <div class="counter-item" :title="$t('profile.archivedWalletsAmount')" v-b-tooltip.top>
                        <b-icon-archive-fill></b-icon-archive-fill>
                        <span>{{ counters.walletsArchived }}</span>
                    </div>
                </div>

                <b-icon-exclamation-triangle-fill
                    v-if="loadFailed && !isLoading"
                    variant="warning"
                ></b-icon-exclamation-triangle-fill>
            </b-list-group-item>
            <b-list-group-item class="text-secondary">
                <b-spinner v-if="!loadFailed && isLoading" small></b-spinner>

                <div v-if="!loadFailed && !isLoading"
                     class="d-flex justify-content-around"
                >
                    <div class="counter-item" :title="$t('profile.totalChargesAmount')" v-b-tooltip.top>
                        <b-icon-cash-stack></b-icon-cash-stack>
                        <span>{{ counters.charges }}</span>
                    </div>
                    <div class="counter-item" :title="$t('profile.incomeChargesAmount')" v-b-tooltip.top>
                        <b-icon-arrow-up variant="success"></b-icon-arrow-up>

                        <span>{{ counters.chargesIncome }}</span>
                    </div>
                    <div class="counter-item" :title="$t('profile.expenseChargesAmount')" v-b-tooltip.top>
                        <b-icon-arrow-down variant="danger"></b-icon-arrow-down>
                        <span>{{ chargesExpense }}</span>
                    </div>
                </div>

                <b-icon-exclamation-triangle-fill
                    v-if="loadFailed && !isLoading"
                    variant="warning"
                ></b-icon-exclamation-triangle-fill>
            </b-list-group-item>
        </b-list-group>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import {
    CountersStatisticsInterface,
    CountersStatisticsResponseInterface,
    ProfileRepository,
    ProfileRepositoryInterface
} from '@/api/profile/profile';

@Component
export default class CountersStatistics extends Vue {
    repository: ProfileRepositoryInterface = new ProfileRepository()

    counters: CountersStatisticsInterface|null = null

    loadFailed = false

    mounted() {
        this.load();
    }

    get isLoading(): boolean {
        return this.counters === null;
    }

    get chargesExpense(): number {
        if (this.counters === null) {
            return 0;
        }

        return this.counters.charges - this.counters.chargesIncome;
    }

    protected load() {
        this.loadFailed = false;

        this.repository.getStatisticsCounters()
            .then(response => {
                this.onLoaded(response.data);

                return response;
            })
            .catch(this.onError);
    }

    protected onLoaded(response: CountersStatisticsResponseInterface) {
        this.counters = response.data;
    }

    protected onError() {
        this.loadFailed = true;
    }
}
</script>

<style lang="scss" scoped>
.counter-item {
    padding: 0 5px;
    white-space: nowrap;

    .b-icon {
        margin-right: 5px;
    }
}
</style>
