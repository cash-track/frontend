<template>
    <div class="footer text-center">
        <b-container>
            <div class="text-center float-sm-left">
                © {{ year() }} Cash Track
            </div>
            <b-nav class="justify-content-center float-sm-right">
                <b-nav-item :href="getWebSiteLink('/help')">Help</b-nav-item>
                <b-nav-item :href="getWebSiteLink('/about')">About</b-nav-item>
            </b-nav>
            <div class="clearfix"></div>
        </b-container>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { webSiteLink } from '@/shared/links';

@Component
export default class Footer extends Vue {
    year() {
        return (new Date()).getFullYear()
    }

    getWebSiteLink(path: string): string {
        return webSiteLink(path)
    }
}
</script>

<style scoped lang="scss">
    .footer {
        border-top: 1px solid #eee;
        padding: 20px 0;
        font-size: 14px;
        bottom: 0;
        width: 100%;
        height: 60px;
        margin-top: 15px;

        .nav-link {
            display: block;
            padding: 0 1rem;
            line-height: 22px;
        }
    }

    @media (max-width: 576px) {
        .footer {
            height: auto;
        }
    }
</style>