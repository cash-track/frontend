<template>
    <div class="wallets">
        <b-tabs content-class="mt-3">
            <b-tab :title="$t('wallets.activeTitle')">
                <wallets-active-grid-list></wallets-active-grid-list>
            </b-tab>

            <b-tab :title="$t('wallets.archivedTitle')" lazy>
                <wallets-grid-list :by-archived="true"></wallets-grid-list>
            </b-tab>
        </b-tabs>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import WalletsGridList from '@/components/wallets/WalletsGridList.vue';
import WalletsActiveGridList from '@/components/wallets/WalletsActiveGridList.vue';

@Component({
    components: {WalletsGridList, WalletsActiveGridList}
})
export default class WalletsView extends Vue {

}
</script>
