<template>
    <div class="charges-list">
        <b-list-group>
            <b-list-group-item>
                Wallet 1
            </b-list-group-item>
        </b-list-group>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default class FeaturedWallets extends Vue {

}
</script>

<style scoped>
    .mb-0 span {
        margin-right: 10px;
    }
</style>