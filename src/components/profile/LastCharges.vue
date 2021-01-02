<template>
    <div class="charges-list">
        <b-list-group>
            <b-list-group-item>
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">Позичив</h5>
                    <span>
                        1 005 грн.
                        <b-icon-arrow-down variant="danger" scale="1.5"></b-icon-arrow-down>
                    </span>
                </div>
                <p class="mb-0">
                    <span>
                        <b-icon-wallet></b-icon-wallet>
                        Wallet
                    </span>

                    <span v-b-tooltip="'2020-12-31 17:37:33'">
                        <b-icon-clock></b-icon-clock>
                        1 hour ago
                    </span>
                    <br>
                </p>
            </b-list-group-item>
        </b-list-group>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default class LastCharges extends Vue {

}
</script>

<style scoped>
    .mb-0 span {
        margin-right: 10px;
    }
</style>