<template>
    <tag :tag="tag" @selected="onSelected" :state="state" :error-message="error"></tag>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import { tagCreate, TagInterface, TagResponseInterface } from '@/api/tags';
import Tag from '@/components/tags/Tag.vue';
import { AxiosError, AxiosResponse } from 'axios';

export const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F9B0}-\u{1F9B3}]+/gu

export function parseEmoji(data: string): Array<string> {
    let name = data.trim()
    const potentialIcon = name.substr(0, 2).match(EMOJI_REGEX)
    let icon = ''

    if (potentialIcon !== null && potentialIcon.length > 0) {
        icon = potentialIcon[0]
        name = name.replace(icon, '').trim()
    }

    return [name, icon]
}

@Component({
    components: { Tag }
})
export default class CreateTag extends Vue {
    @Prop({
        required: true,
        type: String,
    })
    name!: string

    state = 'creatable'

    error = ''

    get tag(): TagInterface {
        const parsed = parseEmoji(this.name)

        return {
            id: 0,
            name: parsed[0],
            icon: parsed[1] === '' ? null : parsed[1],
            color: null,
            userId: 0,
            createdAt: '',
            updatedAt: '',
        }
    }

    protected onSelected(tag: TagInterface) {
        this.state = 'loading'
        this.error = ''

        tagCreate({
            name: tag.name,
            icon: tag.icon,
            color: tag.color,
        }).then(this.onSuccess).catch(this.onError)
    }

    protected onSuccess(response: AxiosResponse<TagResponseInterface>) {
        this.state = 'creatable'
        this.$emit('selected', response.data.data)
    }

    protected onError(error: AxiosError) {
        this.state = 'creatable'
        let message = '';

        if (error.response?.status === 422) {
            for (const field in error.response.data.errors) {
                if (message !== '') {
                    message += '<br>'
                }

                message += `<b>${field}</b>: ${error.response.data.errors[field]}`
            }
        } else if (error.message) {
            message = error.message
        }

        this.error = message
    }
}
</script>

<style lang="scss" scoped>

</style>
