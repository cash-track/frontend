<template>
    <div class="row">
        <div class="col-md-8 ml-md-auto mr-md-auto">
            <warning-message message="Unable to load your wallet. Please try again later" :show="loadFailed"></warning-message>
            <wallet-edit v-if="!loadFailed" :wallet="wallet"></wallet-edit>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { emptyWallet, walletGet, WalletInterface } from '@/api/wallets';
import WalletEdit from '@/components/wallets/WalletEdit.vue';
import WarningMessage from '@/components/shared/WarningMessage.vue';

@Component({
    components: {WalletEdit, WarningMessage}
})
export default class WalletEditView extends Vue {
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
