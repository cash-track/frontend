<template>
    <div class="profile">
        <b-row>
            <b-col md="4">
                <profile-title></profile-title>

                <hr>

                <counters-statistics></counters-statistics>
            </b-col>
            <b-col md="8">
                <email-is-not-confirmed-alert></email-is-not-confirmed-alert>

                <charges-flow-statistics></charges-flow-statistics>
            </b-col>
            <b-col md="12">
                <latest-wallets></latest-wallets>
            </b-col>
        </b-row>
        <b-row v-show="false">
            <b-col md="6">
                <p class="lead chapter">Last Charges</p>
                <last-charges></last-charges>
            </b-col>
            <b-col md="6">
                <p class="lead chapter">Featured Wallets</p>
            </b-col>
        </b-row>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import ProfileTitle from '@/components/profile/ProfileTitle.vue';
import LastCharges from '@/components/profile/LastCharges.vue';
import EmailIsNotConfirmedAlert from '@/components/profile/EmailIsNotConfirmedAlert.vue';
import ChargesFlowStatistics from '@/components/profile/ChargesFlowStatistics.vue';
import CountersStatistics from '@/components/profile/CountersStatistics.vue';
import LatestWallets from '@/components/profile/LatestWallets.vue';

@Component({
    components: {
        CountersStatistics,
        ChargesFlowStatistics,
        LastCharges,
        ProfileTitle,
        EmailIsNotConfirmedAlert,
        LatestWallets,
    }
})
export default class ProfileView extends Vue {}
</script>

<style lang="scss" scoped>
.profile .chapter {
    padding-top: 20px;
}
</style>
