<template>
    <b-alert :show="shouldDisplay" dismissible variant="info" >
        <h4 class="alert-heading">{{ $t('profile.emailNotConfirmed') }}</h4>
        {{ $t('profile.emailNotConfirmedMainMessage') }}<br>
        {{ $t('profile.emailNotConfirmedResendMessage') }}<br>
        <b-button variant="outline-info" class="mt-2" :to="{name: 'settings.profile'}">{{ $t('profileSettings.profileSettings') }}</b-button>
    </b-alert>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class EmailIsNotConfirmedAlert extends Vue {
    @Prop({default: () => null})
    show!: false

    get shouldDisplay(): boolean {
        if (this.show !== null) {
            return true;
        }

        return !this.$store.state.isEmailConfirmed
    }
}
</script>

<style lang="scss" scoped>

</style>
