<template>
    <div class="profile">
        <b-row>
            <b-col md="12">
                <wallets-active-short-list class="mb-4"></wallets-active-short-list>
            </b-col>

            <b-col md="4">
                <profile-title></profile-title>

                <hr>

                <counters-statistics></counters-statistics>

                <hr>
            </b-col>
            <b-col md="8">
                <email-is-not-confirmed-alert></email-is-not-confirmed-alert>

                <charges-flow-statistics></charges-flow-statistics>

                <common-tags></common-tags>
            </b-col>
            <b-col md="12">
                <latest-wallets></latest-wallets>
            </b-col>
        </b-row>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import ProfileTitle from '@/components/profile/ProfileTitle.vue';
import EmailIsNotConfirmedAlert from '@/components/profile/EmailIsNotConfirmedAlert.vue';
import ChargesFlowStatistics from '@/components/profile/ChargesFlowStatistics.vue';
import CountersStatistics from '@/components/profile/CountersStatistics.vue';
import LatestWallets from '@/components/profile/LatestWallets.vue';
import CommonTags from '@/components/profile/CommonTags.vue';
import WalletsActiveShortList from '@/components/wallets/WalletsActiveShortList.vue';

@Component({
    components: {
        WalletsActiveShortList,
        CountersStatistics,
        ChargesFlowStatistics,
        ProfileTitle,
        EmailIsNotConfirmedAlert,
        LatestWallets,
        CommonTags,
    }
})
export default class ProfileView extends Vue {}
</script>

<style lang="scss" scoped>
.profile .chapter {
    padding-top: 20px;
}
</style>
