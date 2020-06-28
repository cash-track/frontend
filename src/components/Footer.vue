<template>
    <div class="footer text-center">
        <b-container>
            <div class="text-center float-sm-left">
                © 2020 Cash Track
            </div>
            <b-nav class="justify-content-center float-sm-right">
                <b-nav-item to="help">Help</b-nav-item>
                <b-nav-item>Blog</b-nav-item>
                <b-nav-item to="about">About</b-nav-item>
            </b-nav>
            <div class="clearfix"></div>
        </b-container>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class Footer extends Vue {

}
</script>

<style scoped lang="scss">
    .footer {
        border-top: 1px solid #eee;
        padding: 20px 0;
        font-size: 14px;
        position: absolute;
        bottom: 0;
        width: 100%;
        height: 60px;

        .nav-link {
            display: block;
            padding: 0 1rem;
            line-height: 22px;
        }
    }
</style>