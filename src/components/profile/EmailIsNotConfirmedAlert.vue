<template>
    <b-alert :show="shouldDisplay" dismissible variant="info" >
        <h4 class="alert-heading">Account is not confirmed</h4>
        Please check your mailbox for a confirmation message to activate your account.<br>
        You can resend confirmation message from profile settings.<br>
        <b-button variant="outline-info" class="mt-2" :to="{name: 'settings.profile'}">Settings</b-button>
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
