<template>
    <div>
        <email-is-not-confirmed-alert></email-is-not-confirmed-alert>

        <warning-message :message="$t('wallets.listLoadingError')" :show="loadFailed"></warning-message>

        <b-row>
            <b-col md="6" lg="4" v-for="wallet of wallets" :key="wallet.id">
                <wallet-card :wallet="wallet"></wallet-card>
            </b-col>
        </b-row>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from 'vue-property-decorator';
import Loader from '@/shared/Loader';
import { walletsArchivedGet, WalletFullInterface } from '@/api/wallets';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import WalletCard from '@/components/wallets/WalletCard.vue';
import EmailIsNotConfirmedAlert from '@/components/profile/EmailIsNotConfirmedAlert.vue';

@Component({
    components: {WalletCard, WarningMessage, EmailIsNotConfirmedAlert}
})
export default class WalletsGridList extends Mixins(Loader) {
    @Prop()
    byArchived!: boolean

    wallets: Array<WalletFullInterface> = []

    loadFailed = false

    mounted() {
        this.load()
    }

    get isEmailConfirmed(): boolean {
        return this.$store.state.isEmailConfirmed
    }

    protected load() {
        this.setLoading();
        this.loadFailed = false;

        walletsArchivedGet().then(response => {
            this.wallets = response.data.data
        }).catch(() => {
            this.loadFailed = true;
        }).finally(() => {
            this.setLoaded();
        })
    }
}
</script>

<style lang="scss" scoped>

</style>
