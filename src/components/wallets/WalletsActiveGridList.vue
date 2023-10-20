<template>
    <div>
        <email-is-not-confirmed-alert></email-is-not-confirmed-alert>

        <warning-message :message="$t('wallets.listLoadingError').toString()" :show="isLoadingFailed"></warning-message>

        <draggable v-show="!isLoadingFailed"
                   :list="wallets"
                   v-bind="dragOptions"
                   group="wallets"
                   delay="250"
                   delay-on-touch-only="true"
                   @end="drag = false"
                   @start="drag = true">
            <transition-group type="transition" :name="!drag ? 'flip-list' : null" class="row">
                <b-col md="6" lg="4" v-for="wallet of wallets" :key="wallet.id">
                    <wallet-card :wallet="wallet"></wallet-card>
                </b-col>
            </transition-group>
        </draggable>

        <b-alert variant="success" :show="isEmailConfirmed && displayNoWallets">
            <h2>{{ $t('wallets.noWallets') }}</h2>
            {{ $t('wallets.noWalletsMessage') }}
            <b-button variant="success" size="sm" :to="{name: 'wallets.create'}">{{ $t('wallets.noWalletsCreate') }}</b-button>
        </b-alert>
    </div>
</template>

<script lang="ts">
import { Component, Watch, Mixins } from 'vue-property-decorator';
import draggable from 'vuedraggable';
import Loader from '@/shared/Loader';
import { walletsUnArchivedSort, WalletFullInterface } from '@/api/wallets';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import WalletCard from '@/components/wallets/WalletCard.vue';
import EmailIsNotConfirmedAlert from '@/components/profile/EmailIsNotConfirmedAlert.vue';

@Component({
    components: {draggable, WalletCard, WarningMessage, EmailIsNotConfirmedAlert}
})
export default class WalletsActiveGridList extends Mixins(Loader) {
    drag = false
    isJustLoaded = true

    mounted() {
        if (!this.isLoading) {
            this.$store.dispatch('loadActiveWallets')
        }
    }

    get isEmailConfirmed(): boolean {
        return this.$store.state.isEmailConfirmed
    }

    get wallets(): Array<WalletFullInterface> {
        return this.$store.state.activeWallets
    }

    get isLoading(): boolean {
        return !this.$store.state.activeWalletsLoadingStatus;
    }

    get isLoadingFailed(): boolean {
        return this.$store.state.activeWalletsLoadingFailed
    }

    get displayNoWallets(): boolean {
        return !this.isLoading && !this.isLoadingFailed && this.wallets.length === 0
    }

    get dragOptions() {
        return {
            animation: 200,
            group: "description",
            disabled: false,
            ghostClass: "ghost"
        };
    }

    @Watch('wallets')
    protected onOrderChanged() {
        if (this.isLoading || this.isLoadingFailed || this.wallets.length === 0) {
            return;
        }

        if (this.isJustLoaded) {
            this.isJustLoaded = false
            return;
        }

        this.$store.commit('activeWalletsChanged', this.wallets)

        walletsUnArchivedSort({
            sort: this.wallets.map(wallet => wallet.id),
        })
    }
}
</script>

<style lang="scss" scoped>
.flip-list-move {
    transition: transform 0.5s;
}
.no-move {
    transition: transform 0s;
}
.ghost {
    opacity: 0.5;
}
</style>
