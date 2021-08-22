<template>
    <div>
        <warning-message message="Unable to load your wallets. Please try again later" :show="loadFailed"></warning-message>

        <b-row v-show="!loadFailed">
            <b-col md="6" lg="4" v-for="wallet of walletsOrdered" v-bind:key="wallet.ID">
                <wallet-card :wallet="wallet"></wallet-card>
            </b-col>
        </b-row>

        <b-alert variant="success" :show="displayNoWallets">
            <h2>No Wallets</h2>
            You don't have any wallets yet. Good time to create one.
            <b-button variant="success" size="sm" :to="{name: 'wallets.create'}">Create</b-button>
        </b-alert>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import { walletsGet, walletsArchivedGet, walletsUnArchivedGet, WalletInterface } from '@/api/wallets';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import WalletCard from '@/components/wallets/WalletCard.vue';

@Component({
    components: {WalletCard, WarningMessage}
})
export default class WalletsGridList extends Vue {
    @Prop()
    byArchived!: boolean

    wallets: Array<WalletInterface> = []

    loadFailed = false

    mounted() {
        this.load()
    }

    get displayNoWallets(): boolean {
        if (typeof this.byArchived !== 'undefined' && this.byArchived) {
            return false
        }

        return !this.loadFailed && this.wallets.length === 0
    }

    get walletsOrdered(): Array<WalletInterface> {
        return this.wallets.sort((a: WalletInterface, b: WalletInterface) => {
            return a.isActive === b.isActive ? 0 : (a.isActive ? -1 : 1)
        })
    }

    protected load() {
        this.loadFailed = false;

        this.loader()().then(response => {
            this.wallets = response.data.data
        }).catch(() => {
            this.loadFailed = true;
        })
    }

    protected loader() {
        if (typeof this.byArchived !== 'undefined') {
            return this.byArchived ? walletsArchivedGet : walletsUnArchivedGet;
        }

        return walletsGet;
    }
}
</script>

<style lang="scss" scoped>

</style>
