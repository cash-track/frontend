<template>
    <div class="profile">
        <b-row>
            <b-col md="12" class="text-center">
                <profile-title></profile-title>
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

@Component({
    components: {LastCharges, ProfileTitle}
})
export default class ProfileView extends Vue {}
</script>

<style lang="scss" scoped>
.profile .chapter {
    padding-top: 20px;
}
</style>
