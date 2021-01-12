<template>
    <div class="row">
        <div class="col-md-8 ml-md-auto mr-md-auto">
            <wallet-create></wallet-create>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import WalletCreate from '@/components/wallets/WalletCreate.vue';

@Component({
    components: {WalletCreate}
})
export default class WalletCreateView extends Vue {}
</script>
