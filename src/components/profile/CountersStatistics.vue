<template>
    <b-list-group>
        <b-list-group-item class="d-flex justify-content-between align-items-center text-secondary">
            Wallets

            <b-spinner v-if="!loadFailed && isLoading" small></b-spinner>

            <b-nav v-if="!loadFailed && !isLoading">
                <b-nav-item title="Total wallets amount" v-b-tooltip.top disabled class="h6 mb-0" link-classes="py-0">
                    <b-icon-wallet class="mr-1"></b-icon-wallet>
                    <span>{{ counters.wallets }}</span>
                </b-nav-item>
                <b-nav-item title="Archived wallets amount" v-b-tooltip.top disabled class="h6 mb-0" link-classes="py-0 pr-0">
                    <b-icon-archive-fill class="mr-1"></b-icon-archive-fill>
                    <span>{{ counters.walletsArchived }}</span>
                </b-nav-item>
            </b-nav>

            <b-icon-exclamation-triangle-fill
                v-if="loadFailed && !isLoading"
                variant="warning"
            ></b-icon-exclamation-triangle-fill>
        </b-list-group-item>
        <b-list-group-item class="d-flex justify-content-between align-items-center text-secondary">
            Charges

            <b-spinner v-if="!loadFailed && isLoading" small></b-spinner>

            <b-nav v-if="!loadFailed && !isLoading">
                <b-nav-item title="Total charges amount" v-b-tooltip.top disabled class="h6 mb-0" link-classes="py-0">
                    <b-icon-cash-stack class="mr-1"></b-icon-cash-stack>
                    <span>{{ counters.charges }}</span>
                </b-nav-item>
                <b-nav-item title="Amount of income charges" v-b-tooltip.top disabled class="h6 mb-0" link-classes="py-0">
                    <b-icon-arrow-up variant="success" class="mr-1"></b-icon-arrow-up>

                    <span>{{ counters.chargesIncome }}</span>
                </b-nav-item>
                <b-nav-item title="Amount of expense charges" v-b-tooltip.top disabled class="h6 mb-0" link-classes="py-0 pr-0">
                    <b-icon-arrow-down variant="danger" class="mr-1"></b-icon-arrow-down>
                    <span>{{ chargesExpense }}</span>
                </b-nav-item>
            </b-nav>

            <b-icon-exclamation-triangle-fill
                v-if="loadFailed && !isLoading"
                variant="warning"
            ></b-icon-exclamation-triangle-fill>
        </b-list-group-item>
    </b-list-group>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import {
    CountersStatisticsInterface,
    CountersStatisticsResponseInterface,
    profileStatisticsCountersGet
} from '@/api/profile/profile';

@Component
export default class CountersStatistics extends Vue {
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

        profileStatisticsCountersGet()
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

</style>
