<template>
    <div>
        <b-navbar toggleable="lg" type="light">
            <b-container>
                <b-navbar-brand :to="{name: 'home'}">Cash Track</b-navbar-brand>

                <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

                <b-collapse id="nav-collapse" is-nav>
                    <b-navbar-nav>
                        <b-nav-item :to="{name: 'home'}" exact-active-class="active">Home</b-nav-item>
                        <b-nav-item :to="{name: 'help'}" exact-active-class="active">Help</b-nav-item>
                        <b-nav-item :to="{name: 'about'}" exact-active-class="active">About</b-nav-item>
                    </b-navbar-nav>

                    <b-navbar-nav class="ml-auto">
                        <b-navbar-nav>
                            <b-nav-item :to="{name: 'login'}" exact-active-class="active">Sign In</b-nav-item>
                            <b-nav-item :to="{name: 'register'}" exact-active-class="active">Sign Up</b-nav-item>
                        </b-navbar-nav>
                    </b-navbar-nav>
                </b-collapse>
            </b-container>
        </b-navbar>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class Header extends Vue {

}
</script>

<style scoped>
    .navbar {
        background: #f5f5f5;
        border-bottom: 1px solid #e5e5e5;
        border-radius: 0;
        margin-bottom: 20px;
    }
</style>