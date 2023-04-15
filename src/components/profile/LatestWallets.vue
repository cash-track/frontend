<template>
    <b-row>
        <b-col md="12">
            <h4>{{ $t('profile.latestWallets') }}</h4>
            <hr>
        </b-col>
        <b-col md="6" v-for="wallet in walletsOrdered" :key="wallet.id">
            <wallet-card :wallet="wallet"></wallet-card>
        </b-col>
    </b-row>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import WarningMessage from '@/components/shared/WarningMessage.vue';
import WalletCard from '@/components/wallets/WalletCard.vue';
import { profileWalletsLatestGet } from '@/api/profile/profile';
import { WalletFullInterface, WalletsFullResponseInterface } from '@/api/wallets';

@Component({
    components: {WalletCard, WarningMessage}
})
export default class LatestWallets extends Vue {
    wallets: Array<WalletFullInterface> = []

    loadFailed = false

    get walletsOrdered(): Array<WalletFullInterface> {
        return this.wallets.sort((a: WalletFullInterface, b: WalletFullInterface) => a.isActive === b.isActive ? 0 : (a.isActive ? -1 : 1))
    }

    mounted() {
        this.load();
    }

    protected load() {
        this.loadFailed = false;

        profileWalletsLatestGet()
            .then(response => {
                this.onLoaded(response.data);

                return response;
            })
            .catch(this.onError);
    }

    protected onLoaded(response: WalletsFullResponseInterface) {
        this.wallets = response.data;
    }

    protected onError() {
        this.loadFailed = true;
    }
}
</script>

<style lang="scss" scoped>

</style>
