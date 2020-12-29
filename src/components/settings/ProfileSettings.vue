<template>
    <b-form novalidate @submit="onSubmit">
        <b-card no-body>
            <b-card-header class="text-sm-center"><b>Profile Settings</b></b-card-header>

            do form here

            <b-card-footer class="text-sm-center">
                <b-button variant="primary" type="submit">Update Profile</b-button>
            </b-card-footer>
        </b-card>
    </b-form>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default class ProfileSettings extends Vue {

    protected onSubmit(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        //
    }
}
</script>

<style scoped>

</style>