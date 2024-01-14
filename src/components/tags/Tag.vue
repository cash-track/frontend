<template>
    <b-badge
        href="#"
        variant="secondary"
        class="badge-tag border border-secondary"
        :class="{'active': active, 'darker': isDarker}"
        :style="{'background-color': backgroundColor}"
        v-if="tag"
        @click="onSelected"
    >
        <span class="icon">{{ tag.icon }}</span> {{ tag.name }}
        <b-button v-if="isClosable && !hasError">
            <b-icon icon="x"></b-icon>
        </b-button>
        <b-button v-if="isCreatable && !hasError">
            <b-icon icon="plus"></b-icon>
        </b-button>
        <b-button class="loading" v-if="isLoading && !hasError">
            <b-spinner small></b-spinner>
        </b-button>
        <b-button v-if="hasError">
            <b-icon icon="exclamation-triangle" v-b-popover.hover.left="{ title: $t('error'), content: errorMessage, html: true }"></b-icon>
        </b-button>
    </b-badge>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import { TagInterface } from '@/api/tags';
import { getRGBBrightness } from '@/shared/numbers';
import { parseRGBFromHex } from '@/shared/strings';

const BRIGHTNESS_MAX = 255
const BRIGHTNESS_CONTRAST_LIMIT = 125

@Component({})
export default class Tag extends Vue {
    @Prop({
        required: true
    })
    tag!: TagInterface

    @Prop({
        required: false,
        type: String,
        validator(value: string): boolean {
            return ['closable', 'creatable', 'loading'].includes(value)
        }
    })
    state!: string

    @Prop({
        type: String
    })
    errorMessage!: string

    @Prop({
        type: Boolean,
        default: false,
    })
    active!: boolean

    get hasColor(): boolean {
        return this.tag.color !== null &&
            this.tag.color !== undefined &&
            this.tag.color !== '#000000' &&
            this.tag.color !== '#ffffff'
    }

    get backgroundColor(): string|null {
        return this.hasColor ? this.tag.color : null
    }

    get backgroundColorBrightness(): number {
        if (this.tag.color === null || !this.hasColor) {
            return BRIGHTNESS_MAX
        }

        const rgb = parseRGBFromHex(this.tag.color)

        if (rgb === null) {
            return BRIGHTNESS_MAX
        }

        return getRGBBrightness(rgb)
    }

    get isDarker(): boolean {
        return this.backgroundColorBrightness <= BRIGHTNESS_CONTRAST_LIMIT
    }

    get isEmailConfirmed(): boolean {
        return this.$store.state.isEmailConfirmed
    }

    get isClosable(): boolean {
        return !this.hasError && this.state === 'closable'
    }

    get isCreatable(): boolean {
        return !this.hasError && this.state === 'creatable'
    }

    get isLoading(): boolean {
        return !this.hasError && this.state === 'loading'
    }

    get hasError(): boolean {
        if (this.errorMessage === undefined) {
            return false
        }

        return this.errorMessage.length > 0
    }

    onSelected(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.$emit('selected', this.tag)
    }
}
</script>

<style lang="scss" scoped>
@import "node_modules/bootstrap/scss/functions";
@import "node_modules/bootstrap/scss/variables";
@import "node_modules/bootstrap/scss/mixins/_breakpoints";

.form-group, .list-ltr {
    .badge-tag {
        margin-left: 0;
        margin-right: 5px;

        & + .badge-tag {
            margin-left: 0;
            margin-right: 5px;
        }
    }
}

.text-md-right {
    .badge-tag {
        margin-bottom: 5px;
    }
}

.badge-tag {
    background-color: transparent;
    font-size: 14px;
    font-weight: 400;
    border-color: #ced4da!important;
    padding: 6px 10px;
    color: #495057;
    transition-property: color, background-color, border-color, box-shadow, opacity;

    &.darker {
        color: #eaeaea;
        border-color: #62686d !important;

        button:hover {
            background-color: rgba(219, 227, 234, 0.25);
        }
    }

    &.active:not(:hover, :active, :focus) {
        box-shadow: 0 0 0 0.2rem rgb(73 80 87 / 25%);
    }

    & + .badge-tag {
        margin-left: 5px;
        margin-bottom: 5px;
    }

    .icon {
        font-size: 13px;
    }

    button {
        font-size: 16px;
        margin: -12px -10px -10px 5px;
        line-height: 26px;
        padding: 1px 6px 0;
        background: none;
        color: inherit;
        border-radius: 0;
        border: 0;

        &.loading {
            font-size: 12px;
        }

        &:hover {
            background-color: rgb(108 117 125 / 25%);
        }
    }

    &:hover, &:active, &:focus, &.active {
        color: #2a2c2f !important;
        background-color: rgb(108 117 125 / 10%);
        border-color: rgb(81 87 93 / 32%) !important;
        box-shadow: none;

        &.darker {
            color: #ffffff !important;
            opacity: 0.9;
        }
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
