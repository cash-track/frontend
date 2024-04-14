<template>
    <b-form novalidate>
        <b-card footer-tag="footer" header-tag="header">
            <template v-slot:header>
                <div class="text-md-center">
                    <b-icon-shield-check></b-icon-shield-check> &nbsp;
                    <b>{{ $t('passkeySettings.passkeys') }}</b>
                </div>
            </template>

            <passkeys-settings />
        </b-card>
    </b-form>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import PasskeysSettings from '@/components/settings/passkeys/PasskeysSettings.vue';

@Component({
    components: {PasskeysSettings}
})
export default class PasskeysSettingsCard extends Vue {

}
</script>

<style scoped>

</style>
