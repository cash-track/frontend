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
                <span class="text-muted wallet-card-currency">
                    {{ wallet.defaultCurrency.name }} ({{ wallet.defaultCurrency.code }})
                </span>
                <span class="text-primary wallet-card-price">
                    <b>{{ wallet.totalAmount | money(wallet.defaultCurrency) }}</b>
                </span>
            </b-list-group-item>
        </b-list-group>

        <template v-slot:footer>
            <div class="d-flex justify-content-between">
                <div class="wallet-card-members">
                    <b-avatar-group size="2em" v-if="!hasOneMember">
                        <profile-avatar
                            v-for="user of members"
                            :user="user"
                            v-bind:key="user.id"
                            :title="`${user.name} ${user.lastName}`"
                            v-b-tooltip.top
                        ></profile-avatar>
                        <b-avatar
                            text="..."
                            v-if="hasMoreMembers"
                            title="and more members.."
                            v-b-tooltip.top
                        ></b-avatar>
                    </b-avatar-group>
                    <div v-else>
                        <profile-avatar
                            :user="members[0]"
                            size="2em"
                            :title="`${members[0].name} ${members[0].lastName}`"
                            v-b-tooltip.top
                        ></profile-avatar>
                    </div>
                </div>
                <span class="text-muted wallet-card-last-activity">
                    {{ wallet.updatedAt | moment("from") }}
                    <b-icon-clock></b-icon-clock>
                </span>
            </div>
        </template>
    </b-card>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { emptyWallet, WalletInterface } from '@/api/wallets';
import { UserInterface } from '@/api/users';
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue';

const USERS_LIMIT = 4

@Component({
    components: {ProfileAvatar}
})
export default class WalletCard extends Vue {
    @Prop({
        required: true,
        default: emptyWallet(),
    })
    wallet!: WalletInterface

    get members(): Array<UserInterface> {
        const users: Array<UserInterface> = []

        users.push(this.$store.state.profile)

        for (const user of this.wallet.users) {
            if (user.id === this.$store.state.profile.id) {
                continue
            }

            users.push(user)

            if (users.length >= USERS_LIMIT) {
                break
            }
        }

        return users
    }

    get hasOneMember(): boolean {
        return this.wallet.users.length === 1
    }

    get hasMoreMembers(): boolean {
        return this.wallet.users.length > USERS_LIMIT
    }

    onWalletClick() {
        this.$router.push({
            name: 'wallets.show',
            params: {
                walletID: this.wallet.id.toString(),
                nameForTitle: this.wallet.name,
            }
        })
    }
}
</script>

<style lang="scss" scoped>
    .wallet-card {
        cursor: pointer;
        background-color: #f5f5f5;
        margin-bottom: 15px;

        .card-title {
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden;
        }

        .card-footer {
            padding-top: 0.5rem;
            padding-bottom: 0.5rem;
        }

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

        .wallet-card-currency {
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden;
        }

        .wallet-card-price {
            white-space: nowrap;
        }

        .wallet-card-last-activity {
            line-height: 30px;
        }
    }

    .wallet-card-active {
        background-color: #fff;

        .list-group-item {
            background-color: #fff;
        }
    }
</style>