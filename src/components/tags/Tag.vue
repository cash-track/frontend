<template>
    <b-badge
        href="#"
        variant="secondary"
        class="badge-tag text-secondary border border-secondary"
        v-if="tag"
    >
        {{ tag.icon }} {{ tag.name }}
    </b-badge>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import { TagInterface } from '@/api/tags';

@Component({})
export default class WalletEdit extends Vue {
    @Prop({
        required: true
    })
    tag!: TagInterface
}
</script>

<style lang="scss" scoped>
@import "node_modules/bootstrap/scss/functions";
@import "node_modules/bootstrap/scss/variables";
@import "node_modules/bootstrap/scss/mixins/_breakpoints";

.badge-tag {
    background-color: transparent;
    font-size: 14px;
    font-weight: 400;
    padding-top: 0.2em;

    & + .badge-tag {
        margin-left: 5px;
    }

    &:hover {
        color: #fff !important;
        background-color: rgba(73, 79, 84, 0.75);
    }

    &:active, &:focus {
        box-shadow: none;
    }
}

@include media-breakpoint-down(sm) {
    .badge-tag {
        margin-right: 5px;

        & + .badge-tag {
            margin-left: 0;
        }
    }
}
</style>
