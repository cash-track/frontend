<template>
    <b-form novalidate @submit="onSubmit">
        <b-card footer-tag="footer" header-tag="header">
            <template v-slot:header>
                <div class="text-md-center">
                    <b>Photo</b>
                </div>
            </template>

            <b-form-group
                label-align-lg="right"
                label-cols-lg="4"
                class="current-photo-group"
            >
                <template v-slot:label>Current Photo</template>
                <b-avatar :src="currentPhotoUrl" size="10rem" alt="Your current photo"></b-avatar>
            </b-form-group>


            <b-form-group
                label-align-lg="right"
                label-cols-lg="4"
                label-for="photo"
                :invalid-feedback="validationMessage('photo')"
                :state="validationState('photo')"
                description="Your personal profile photo. The best choice is a square photo (for ex: 500pxx500px). Do not use too big picture as it is useless."
            >
                <template v-slot:label>File</template>
                <b-form-file
                    id="photo"
                    v-model="form.photo"
                    required
                    :disabled="isLoading"
                    :state="validationState('photo')"
                    @change="resetValidationMessage('photo')"
                    placeholder="Choose a file or drop it here..."
                    drop-placeholder="Drop file here..."
                ></b-form-file>
                <div class="mt-3" v-if="form.photo">Selected file: {{ form.photo.name }}</div>
            </b-form-group>

            <b-alert
                variant="warning"
                fade
                dismissible
                :show="hasMessage"
                @dismissed="resetMessage()"
            >
                <b-icon-exclamation-triangle-fill></b-icon-exclamation-triangle-fill>
                {{ message }}
            </b-alert>

            <b-alert
                variant="success"
                fade
                dismissible
                :show="successMessage !== ''"
                @dismissed="successMessage = ''"
            >
                <b-icon-check2-circle></b-icon-check2-circle>
                {{ successMessage }}
            </b-alert>

            <template v-slot:footer>
                <div class="text-center">
                    <b-button variant="primary" type="submit" :disabled="isLoading">
                        Save
                        <b-spinner v-show="isLoading" small></b-spinner>
                    </b-button>
                </div>
            </template>
        </b-card>
    </b-form>
</template>

<script lang="ts">
import { Mixins, Component } from 'vue-property-decorator';
import { MutationPayload } from "vuex";
import Loader from '@/shared/Loader';
import Messager from '@/shared/Messager';
import Validator from '@/shared/Validator';
import {ProfilePhotoResponseInterface, profilePutPhoto, UpdateProfilePhotoRequestInterface} from '@/api/profile';
import {AxiosResponse} from "axios";

@Component
export default class ProfilePhoto extends Mixins(Loader, Messager, Validator) {
    form: UpdateProfilePhotoRequestInterface = {
        photo: null,
    }

    currentPhotoUrl = ''

    successMessage = ''

    unsubscribeFromStore: Function|null = null

    mounted() {
        this.loadProfile()

        if (this.$store.state.isLogged) {
            this.loadProfile()
        } else {
            this.unsubscribeFromStore = this.$store.subscribe(this.onProfileLoaded)
        }
    }

    protected onProfileLoaded(mutation: MutationPayload) {
        if (mutation.type !== 'login') {
            return
        }

        this.loadProfile()
    }

    protected loadProfile() {
        if (typeof this.unsubscribeFromStore === 'function') {
            this.unsubscribeFromStore()
        }

        this.currentPhotoUrl = this.$store.state.profile.photoUrl
    }

    protected onSubmit(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.resetValidationMessages()
        this.resetMessage()
        this.setLoading()
        this.successMessage = ''

        profilePutPhoto(this.form)
            .then(this.onSuccess)
            .catch(this.dispatchError)
            .finally(this.setLoaded)
    }

    protected onSuccess(res: AxiosResponse<ProfilePhotoResponseInterface>) {
        this.form.photo = null;
        this.currentPhotoUrl = res.data.url;
        this.$store.commit('profilePhotoUpdated', res.data.url);
        this.successMessage = res.data.message;
    }
}
</script>

<style scoped lang="scss">
    .current-photo-group::v-deep .form-row {
        align-items: center;
    }
</style>
