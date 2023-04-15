<template>
    <div>
        <warning-message :message="$t('wallets.listLoadingError')" :show="loadFailed"></warning-message>

        <draggable v-show="!loadFailed"
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

        <b-alert variant="success" :show="displayNoWallets">
            <h2>{{ $t('wallets.noWallets') }}</h2>
            {{ $t('wallets.noWalletsMessage') }}
            <b-button variant="success" size="sm" :to="{name: 'wallets.create'}">{{ $t('wallets.noWalletsCreate') }}</b-button>
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
    WalletFullInterface
} from '@/api/wallets';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import WalletCard from '@/components/wallets/WalletCard.vue';

@Component({
    components: {draggable, WalletCard, WarningMessage}
})
export default class WalletsGridList extends Mixins(Loader) {
    @Prop()
    byArchived!: boolean

    wallets: Array<WalletFullInterface> = []

    loadFailed = false

    drag = false

    mounted() {
        this.load()
    }

    get displayNoWallets(): boolean {
        if (typeof this.byArchived !== 'undefined' && this.byArchived) {
            return false
        }

        return !this.isLoading && !this.loadFailed && this.wallets.length === 0
    }

    get dragOptions() {
        let isDisabled = true;

        if (typeof this.byArchived !== 'undefined' && !this.byArchived) {
            isDisabled = false;
        }

        return {
            animation: 200,
            group: "description",
            disabled: isDisabled,
            ghostClass: "ghost"
        };
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
