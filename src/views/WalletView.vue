<template>
    <div class="wallet">
        <warning-message message="Unable to load your wallet. Please try again later" :show="loadFailed"></warning-message>

        <div v-if="wallet.id">
            {{ wallet.name }}
        </div>
    </div>
</template>

<script lang="ts">
import {Vue, Component, Prop} from 'vue-property-decorator'
import {emptyWallet, walletGet, WalletInterface} from "@/api/wallets";
import WarningMessage from "@/components/shared/WarningMessage.vue";

@Component({
    components: {WarningMessage}
})
export default class WalletView extends Vue {
    @Prop({
        required: true,
    })
    walletID!: number

    wallet: WalletInterface = emptyWallet()

    loadFailed = false

    mounted() {
        this.load()
    }

    protected load() {
        this.loadFailed = false;

        walletGet(this.walletID).then(response => {
            this.wallet = response.data.data
        }).catch(() => {
            this.loadFailed = true;
        })
    }
}
</script>
