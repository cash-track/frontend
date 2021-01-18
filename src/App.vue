<template>
    <div id="app">
        <Header></Header>

        <b-container>
            <router-view/>
        </b-container>

        <Footer></Footer>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Header from '@/components/Header.vue';
import Footer from '@/components/Footer.vue';
import { webSiteLink } from './shared/links';

@Component({
    components: {Header, Footer}
})
export default class App extends Vue {
    mounted() {
        this.$store.dispatch('loadProfile').finally(() => {
            // this.validateIsLogged()
        })

        // TODO. Add same checking once browser tab gets activated (receive focus)
    }

    validateIsLogged() {
        console.log("is logged:", this.$store.state.isLogged)

        if (! this.$store.state.isLogged) {
            // this.redirectToLogin()
        }
    }

    redirectToLogin() {
        window.location.href = webSiteLink('/login');
    }
}

</script>

<style lang="scss">

</style>
