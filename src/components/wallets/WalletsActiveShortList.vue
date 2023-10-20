<template>
    <div class="wallet-list-short" v-show="wallets.length">
        <b-list-group horizontal>
            <b-list-group-item v-for="wallet of wallets"
                               :key="wallet.id"
                               @click="navigate(wallet)"
                               href="#"
                               class="d-flex justify-content-between"
            >
                <span class="wallet-list-name">
                    {{ wallet.name }}
                </span>
                <span class="text-primary wallet-list-total">
                    <b>{{ wallet.totalAmount | money(wallet.defaultCurrency) }}</b>
                </span>
            </b-list-group-item>
        </b-list-group>
    </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import Loader from '@/shared/Loader';
import { WalletFullInterface } from '@/api/wallets';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import WalletCard from '@/components/wallets/WalletCard.vue';
import EmailIsNotConfirmedAlert from '@/components/profile/EmailIsNotConfirmedAlert.vue';

@Component({
    components: {WalletCard, WarningMessage, EmailIsNotConfirmedAlert}
})
export default class WalletsActiveShortList extends Mixins(Loader) {
    get wallets(): Array<WalletFullInterface> {
        return this.$store.state.activeWallets.filter((wallet: WalletFullInterface) => wallet.isActive)
    }

    get isLoading(): boolean {
        return !this.$store.state.activeWalletsLoadingStatus;
    }

    get isLoadingFailed(): boolean {
        return this.$store.state.activeWalletsLoadingFailed
    }

    protected navigate(wallet: WalletFullInterface) {
        this.$router.push({
            name: 'wallets.show',
            params: {
                walletID: wallet.id.toString(),
                nameForTitle: wallet.name,
            }
        })
    }
}
</script>

<style lang="scss" scoped>
.wallet-list-short {
    position: relative;
    overflow: hidden;

    &:before {
        content: "";
        width: 50px;
        height: 100%;
        position: absolute;
        right: 0;
        top: 0;
        z-index: 1;
        background: linear-gradient(to right, transparent 0px, #ffffff);
    }

    .list-group {
        overflow-y: scroll;
        padding-right: 50px;

        .list-group-item {
            padding-top: 0.5rem;
            padding-bottom: 0.5rem;
            width: auto;
        }
    }

    .wallet-list-name {
        white-space: nowrap;
        text-overflow: ellipsis;
        max-width: 250px;
        overflow: hidden;
    }

    .wallet-list-total {
        padding-left: 10px;
        white-space: nowrap;
    }
}

</style>
