<template>
    <div class="wallets">
        <warning-message message="Unable to load your wallets. Please try again later" :show="loadFailed"></warning-message>

        <b-row>
            <b-col sm="6" md="4" v-for="wallet of normalWallets" v-bind:key="wallet.ID">
                <wallet-card :wallet="wallet"></wallet-card>
            </b-col>
        </b-row>

        <br>
        <br>
        <p class="lead" v-if="archivedWallets.length">Archived</p>
        <hr>
        <b-row v-if="archivedWallets.length">
            <b-col sm="6" md="4" v-for="wallet of archivedWallets" v-bind:key="wallet.ID">
                <wallet-card :wallet="wallet"></wallet-card>
            </b-col>
        </b-row>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import { walletsGet, WalletInterface } from "@/api/wallets";
import WarningMessage from "@/components/shared/WarningMessage.vue";
import WalletCard from "@/components/wallets/WalletCard.vue";

@Component({
    components: {WalletCard, WarningMessage}
})
export default class WalletsView extends Vue {
    wallets: Array<WalletInterface> = []

    loadFailed = false

    mounted() {
        this.loadWallets()
    }

    get normalWallets(): Array<WalletInterface> {
        return this.wallets.filter(wallet => !wallet.isArchived)
    }

    get archivedWallets(): Array<WalletInterface> {
        return this.wallets.filter(wallet => wallet.isArchived)
    }

    protected loadWallets() {
        this.loadFailed = false;

        walletsGet().then(response => {
            this.wallets = response.data.data
        }).catch(() => {
            this.loadFailed = true;
        })
    }
}
</script>
