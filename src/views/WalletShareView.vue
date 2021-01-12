<template>
    <div class="row">
        <div class="col-md-8 ml-md-auto mr-md-auto">
            <warning-message message="Unable to load your wallet. Please try again later" :show="loadFailed"></warning-message>
            <wallet-share :wallet="wallet"></wallet-share>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { emptyWallet, walletGet, WalletInterface } from '@/api/wallets';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import WalletShare from '@/components/wallets/WalletShare.vue';

@Component({
    components: {WalletShare, WarningMessage}
})
export default class WalletShareView extends Vue {
    @Prop()
    walletID!: number

    wallet: WalletInterface = emptyWallet()

    loadFailed = false

    mounted() {
        this.load()
    }

    protected load() {
        this.loadFailed = false

        walletGet(this.walletID).then(response => {
            this.wallet = response.data.data
        }).catch(() => {
            this.loadFailed = true
        })
    }
}
</script>
