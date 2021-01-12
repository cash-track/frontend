<template>
    <b-card
        no-body
        footer-tag="footer"
        class="wallet-card"
        :class="{'wallet-card-active': wallet.isActive}"
        @click="onWalletClick"
    >
        <b-card-body class="clearfix">
            <b-badge class="float-right" variant="primary" v-if="wallet.isActive">active</b-badge>
            <b-badge class="float-right" variant="secondary" v-if="wallet.isArchived">archived</b-badge>

            <h4 class="card-title">
                {{ wallet.name }}
            </h4>
        </b-card-body>

        <b-list-group flush>
            <b-list-group-item class="d-flex justify-content-between">
                <span class="text-muted">
                    {{ wallet.defaultCurrency.name }} ({{ wallet.defaultCurrency.code }})
                </span>
                <span class="text-primary">
                    <b>{{ wallet.totalAmount }} {{ wallet.defaultCurrency.char }}</b>
                </span>
            </b-list-group-item>
        </b-list-group>

        <template v-slot:footer>
            <div class="d-flex justify-content-between">
                <span class="text-muted">
                    {{ wallet.updatedAt }}
                    <b-icon-clock></b-icon-clock>
                </span>
            </div>
        </template>
    </b-card>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { emptyWallet, WalletInterface } from '@/api/wallets';

@Component
export default class WalletCard extends Vue {
    @Prop({
        required: true,
        default: emptyWallet(),
    })
    wallet!: WalletInterface

    onWalletClick() {
        this.$router.push({
            name: 'wallets.show',
            params: {walletID: this.wallet.id.toString()}
        })
    }
}
</script>

<style lang="scss" scoped>
    .wallet-card {
        cursor: pointer;
        background-color: #f5f5f5;
        margin-bottom: 15px;

        .list-group-item {
            background-color: #f5f5f5;
        }

        &:hover {
            border-color: #007bff!important;
        }

        .list-group {
            border-top: 1px solid rgba(0, 0, 0, 0.125);
            border-bottom: none;
        }

        .badge {
            margin-left: 5px;
        }
    }

    .wallet-card-active {
        background-color: #fff;

        .list-group-item {
            background-color: #fff;
        }
    }
</style>