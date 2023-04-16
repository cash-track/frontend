<template>
    <div class="footer text-center">
        <b-container>
            <div class="row align-items-start">
                <div class="col-sm text-sm-left text-center">
                    © {{ year() }} Cash Track
                </div>
                <div class="col-sm text-center" v-html="$t('madeBy')"></div>
                <div class="col-sm text-sm-right text-center">
                    <b-nav class="justify-content-sm-end justify-content-center">
                        <b-nav-item :href="getWebSiteLink('/help')">{{ $t('help') }}</b-nav-item>
                        <b-nav-item :href="getWebSiteLink('/about')">{{ $t('about') }}</b-nav-item>
                    </b-nav>
                </div>
            </div>
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