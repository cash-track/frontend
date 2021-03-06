<template>
    <div class="charges-list-container">
        <div class="charge-loader-main" v-show="isLoading">
            <div class="d-flex justify-content-center">
                <b-spinner variant="light"></b-spinner>
                <span class="loading-text ml-2">Loading Charges..</span>
            </div>
        </div>

        <warning-message message="Unable to load charges. Please try again later" :show="isLoadingFailed" class="mt-3"></warning-message>

        <b-row class="charge-item" v-if="!isLoadingFailed && wallet.isActive">
            <b-col offset-md="4" md="8" class="charge-main-container wallet-charge-create">
                <b-icon-plus class="charge-type" variant="muted" scale="2"></b-icon-plus>

                <b-button variant="outline-primary" v-b-toggle.charge-create>New Charge</b-button>

                <b-collapse class="charge-create" id="charge-create">
                    <charge-create :wallet="wallet" @created="onChargeCreated"></charge-create>
                </b-collapse>
            </b-col>
        </b-row>

        <div class="charges-list" v-if="!isLoadingFailed">
            <charge-item
                v-for="charge of charges"
                v-bind:key="charge.id"
                :wallet="wallet"
                :charge="charge"
                @updated="onChargeUpdated"
                @deleted="onChargeDeleted"
            ></charge-item>

            <div class="charge-loader-pagination" v-if="isLoadingPagination">
                <div class="d-flex justify-content-center">
                    <b-spinner small></b-spinner>
                    <span class="loading-text ml-2">Loading more..</span>
                </div>
            </div>

            <vue-visibility-trigger @scrolledIn="onLoadMoreCharges"></vue-visibility-trigger>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { AxiosResponse } from 'axios';
import Loader from '@/shared/Loader';
import { WalletInterface } from '@/api/wallets';
import { ChargeInterface, ChargesResponseInterface, walletChargesGet, walletChargesGetPaginated } from '@/api/charges';
import { emptyPagination, PaginationInterface } from '@/api/pagination';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import { ChargeUpdatedEvent } from '@/components/wallets/ChargeEdit.vue';
import ChargeItem, { ChargeDeletedEvent } from '@/components/wallets/ChargeItem.vue';
import ChargeCreate, {ChargeCreatedEvent} from '@/components/wallets/ChargeCreate.vue';

const PAGINATION = 'pagination'

@Component({
    components: {ChargeCreate, WarningMessage, ChargeItem}
})
export default class ChargesList extends Mixins(Loader) {
    @Prop({required: true})
    wallet!: WalletInterface

    charges: Array<ChargeInterface> = []

    pagination: PaginationInterface = emptyPagination()

    get isLoadingPagination(): boolean {
        return this.isLoadingFor(PAGINATION)
    }

    mounted() {
        this.initiallyLoadCharges()
    }

    protected initiallyLoadCharges() {
        this.setLoading()
        this.resetLoadingFailedMessage()

        walletChargesGet(this.wallet.id).then(this.onChargesLoaded).catch(() => {
            this.setLoadingFailedMessage('Unable to load charges. Please try again later')
        }).finally(this.setLoaded)
    }

    protected onChargesLoaded(response: AxiosResponse<ChargesResponseInterface>) {
        this.charges.push(...response.data.data)
        this.pagination = response.data.pagination
    }

    protected onLoadMoreCharges(event: boolean) {
        if (typeof this.pagination === 'undefined') {
            return
        }

        if (!event || this.isLoadingFor(PAGINATION) || this.pagination.nextPage === null) {
            return
        }

        this.resetLoadingFailedMessageFor(PAGINATION)
        this.setLoadingFor(PAGINATION)

        walletChargesGetPaginated(this.wallet.id, this.pagination.nextPage)
            .then(this.onChargesLoaded)
            .catch(() => {
                this.setLoadingFailedMessageFor(PAGINATION, 'Unable to load more charges. Please try again later')
            }).finally(() => {
                this.setLoadedFor(PAGINATION)
            })
    }

    // forward event
    protected onChargeCreated(event: ChargeCreatedEvent) {
        this.charges.unshift(event.charge)
        this.$root.$emit('bv::toggle::collapse', 'charge-create')

        this.$emit('created', event)
    }

    // forward event
    protected onChargeUpdated(event: ChargeUpdatedEvent) {
        const charges = Array.from<ChargeInterface>(this.charges)
        const index = charges.findIndex(charge => charge.id === event.id)

        if (index === -1) {
            console.warn('Unable to find charge in the list. Charge ID:', event.id)
            return
        }

        charges[index] = event.charge

        this.charges = charges

        this.$emit('updated', event)
    }

    // forward event
    protected onChargeDeleted(event: ChargeDeletedEvent) {
        const index = this.charges.findIndex(charge => charge.id === event.id)

        if (index === -1) {
            console.warn('Unable to find charge in the list. Charge ID:', event.id)
            return
        }

        this.charges.splice(index, 1)

        this.$emit('deleted', event)
    }
}
</script>

<style lang="scss" scoped>
@import "node_modules/bootstrap/scss/functions";
@import "node_modules/bootstrap/scss/variables";
@import "node_modules/bootstrap/scss/mixins/_breakpoints";

.charges-list-container {
    position: relative;

    .charge-loader-main {
        padding: 30px 0;
        height: 100%;
        position: absolute;
        width: 100%;
        background: rgb(255 255 255 / 77%);
        z-index: 100;
        cursor: wait;
        backdrop-filter: blur(3px);

        .spinner-border {
            color: #d4d4d4 !important;
        }

        .loading-text {
            color: #a9a9a9;
        }
    }

    .charge-loader-pagination {
        padding: 15px 0;
        cursor: wait;

        .spinner-border {
            color: #d4d4d4 !important;
            width: 1.5rem;
            height: 1.5rem;
        }

        .loading-text {
            color: #a9a9a9;
        }
    }
}

.wallet-charge-create {
    padding-top: 10px;
    padding-bottom: 35px;
    margin-top: 10px;

    .charge-create {
        padding-top: 20px;
    }
}

.charge-date-container {
    padding-top: 10px;
    position: relative;

    .charge-date {
        font-size: 14px;
    }

    .charge-avatar {
        margin: 0 6px 0 35px;
    }
}

.wallet-charge-item {
    border-left: 1px solid #eee;
    padding: 18px 45px 20px;
    position: relative;

    .charge-type {
        position: absolute;
        left: -12px;
        top: 18px;
        background: #fff;
        padding: 6px;
        height: 24px;
        width: 24px;
        text-align: center;
        font-size: 20px;
        line-height: 20px;
        border-radius: 40px;
    }

    .charge-pointer {
        display: block;
        position: absolute;
        top: 30px;
        left: 12px;
        width: 30px;
        height: 0;
        border-top: 1px solid #eee;
    }

    .charge-header {
        cursor: pointer;

        .charge-amount {
            font-weight: 700;
            display: inline-block;
            width: 110px;
            padding: 0 10px 0 0;
        }

        .charge-title {
            overflow: hidden;
            white-space: pre;
            text-overflow: ellipsis;
            max-width: calc(100% - 200px);
            display: inline-block;
            vertical-align: top;
        }
    }

    .charge-body {
        padding-top: 10px;

        &>span {
            white-space: pre;
        }
    }

    &:hover .charge-type {
        cursor: pointer;
        background-color: #eee!important;
    }
}

@include media-breakpoint-down(sm) {
    .charge-item .charge-main-container {
        border-left: 0;

        .charge-type {
            position: initial;
            vertical-align: middle;
            margin: 7px 20px 7px 0;
        }
    }
}
</style>
