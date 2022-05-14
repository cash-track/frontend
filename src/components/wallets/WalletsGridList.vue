<template>
    <div>
        <warning-message message="Unable to load your wallets. Please try again later" :show="loadFailed"></warning-message>

        <draggable v-show="!loadFailed"
                   :list="wallets"
                   class="row"
                   group="wallets"
                   @end="drag = false"
                   @start="drag = true">
                <b-col md="6" lg="4" v-for="wallet of wallets" :key="wallet.id">
                    <wallet-card :wallet="wallet"></wallet-card>
                </b-col>
        </draggable>

        <b-alert variant="success" :show="displayNoWallets">
            <h2>No Wallets</h2>
            You don't have any wallets yet. Good time to create one.
            <b-button variant="success" size="sm" :to="{name: 'wallets.create'}">Create</b-button>
        </b-alert>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Mixins } from 'vue-property-decorator';
import draggable from 'vuedraggable';
import Loader from '@/shared/Loader';
import {
    walletsGet,
    walletsArchivedGet,
    walletsUnArchivedGet,
    walletsUnArchivedSort,
    WalletInterface
} from '@/api/wallets';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import WalletCard from '@/components/wallets/WalletCard.vue';

@Component({
    components: {draggable, WalletCard, WarningMessage}
})
export default class WalletsGridList extends Mixins(Loader) {
    @Prop()
    byArchived!: boolean

    wallets: Array<WalletInterface> = []

    loadFailed = false

    drag = false

    mounted() {
        this.load()
    }

    get displayNoWallets(): boolean {
        if (typeof this.byArchived !== 'undefined' && this.byArchived) {
            return false
        }

        return !this.loadFailed && this.wallets.length === 0
    }

    @Watch('wallets')
    protected onOrderChanged() {
        if (this.isLoading) {
            return;
        }

        const sorter = this.sorter();

        if (sorter === null || this.wallets.length === 0) {
            return;
        }

        sorter({
            sort: this.wallets.map(wallet => wallet.id),
        });
    }

    protected load() {
        this.setLoading();
        this.loadFailed = false;

        this.loader()().then(response => {
            this.wallets = response.data.data
        }).catch(() => {
            this.loadFailed = true;
        }).finally(() => {
            this.setLoaded();
        })
    }

    protected loader() {
        if (typeof this.byArchived !== 'undefined') {
            return this.byArchived ? walletsArchivedGet : walletsUnArchivedGet;
        }

        return walletsGet;
    }

    protected sorter() {
        if (typeof this.byArchived !== 'undefined') {
            return this.byArchived ? null : walletsUnArchivedSort;
        }

        return null;
    }
}
</script>

<style lang="scss" scoped>

</style>
