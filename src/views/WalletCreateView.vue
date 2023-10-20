<template>
    <div class="row">
        <div class="col-md-12">
            <wallets-active-short-list class="mb-4"></wallets-active-short-list>
        </div>
        <div class="col-md-8 ml-md-auto mr-md-auto">
            <wallet-create></wallet-create>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import WalletCreate from '@/components/wallets/WalletCreate.vue';
import WalletsActiveShortList from '@/components/wallets/WalletsActiveShortList.vue';

@Component({
    components: {WalletsActiveShortList, WalletCreate}
})
export default class WalletCreateView extends Vue {}
</script>
