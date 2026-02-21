<template>
    <b-alert
        variant="warning"
        fade
        dismissible
        :show="show"
        @dismissed="hide"
    >
        <b-icon-check2-circle></b-icon-check2-circle>
        {{ message }}
    </b-alert>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class WarningMessage extends Vue {

    @Prop({
        required: true,
        default: '',
        type: String,
    })
    message!: string

    @Prop({
        required: true,
        default: false,
        type: Boolean,
    })
    show!: boolean

    hide() {
        this.$emit('dismissed')
    }
}
</script>

<style scoped>

</style>