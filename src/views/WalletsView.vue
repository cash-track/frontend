<template>
    <div class="wallets">
        <b-tabs content-class="mt-3">
            <b-tab title="Active">
                <wallets-grid-list :by-archived="false"></wallets-grid-list>
            </b-tab>

            <b-tab title="Archived" lazy>
                <wallets-grid-list :by-archived="true"></wallets-grid-list>
            </b-tab>
        </b-tabs>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import WalletsGridList from '@/components/wallets/WalletsGridList.vue';

@Component({
    components: {WalletsGridList}
})
export default class WalletsView extends Vue {

}
</script>
