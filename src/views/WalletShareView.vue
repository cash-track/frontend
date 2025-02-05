<template>
    <div class="row">
        <div class="col-md-12">
            <wallets-active-short-list class="mb-4"></wallets-active-short-list>
        </div>

        <div class="col-md-8 ml-md-auto mr-md-auto">
            <warning-message :message="$t('wallets.loadingError')" :show="loadFailed"></warning-message>
            <wallet-share :wallet="wallet"></wallet-share>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { emptyWallet, WalletInterface, WalletsRepository, WalletsRepositoryInterface } from '@/api/wallets';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import WalletShare from '@/components/wallets/WalletShare.vue';
import WalletsActiveShortList from '@/components/wallets/WalletsActiveShortList.vue';

@Component({
    components: {WalletsActiveShortList, WalletShare, WarningMessage}
})
export default class WalletShareView extends Vue {
    @Prop()
    walletID!: number

    repository: WalletsRepositoryInterface = new WalletsRepository()

    wallet: WalletInterface = emptyWallet()

    loadFailed = false

    mounted() {
        this.load()
    }

    protected load() {
        this.loadFailed = false

        this.repository.get(this.walletID).then(response => {
            this.wallet = response.data.data
        }).catch(() => {
            this.loadFailed = true
        })
    }
}
</script>
