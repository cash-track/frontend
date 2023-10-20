<template>
    <div class="tags">
        <wallets-active-short-list class="mb-4"></wallets-active-short-list>

        <warning-message :message="getMessage()" :show="shouldDisplayMessage()"></warning-message>

        <b-row>
            <b-col md="6">
                <div class="tags-list list-ltr" v-show="tags.length">
                    <tag v-for="item of tagsOrdered"
                         :tag="item"
                         :key="item.id"
                         :active="activeTag !== null && activeTag.id === item.id"
                         @selected="onSelected"
                    ></tag>
                    <tag :tag="{name: $t('tags.addNew')}"
                         state="creatable"
                         :active="activeTag === null"
                         @selected="onSelected(null)"
                    ></tag>
                </div>
            </b-col>
            <b-col md="6">
                <tag-form :tag="activeTag" @created="onCreated" @updated="onUpdated" @deleted="onDeleted"></tag-form>
            </b-col>
        </b-row>
    </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { TagInterface, tagsGet } from '@/api/tags';
import Loader from '@/shared/Loader';
import Messager from '@/shared/Messager';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import Tag from '@/components/tags/Tag.vue';
import TagForm from '@/components/tags/TagForm.vue';
import WalletsActiveShortList from '@/components/wallets/WalletsActiveShortList.vue';

@Component({
    components: {
        WalletsActiveShortList,
        TagForm,
        WarningMessage,
        Tag,
    }
})
export default class TagView extends Mixins(Loader, Messager) {
    tags: Array<TagInterface> = []

    activeTag: TagInterface|null = null

    mounted() {
        this.load()
    }

    get tagsOrdered() {
        return this.tags.sort((a, b) => {
            return Date.parse(a.createdAt) - Date.parse(b.createdAt)
        })
    }

    protected load() {
        this.setLoading();
        this.resetMessage();

        tagsGet().then(response => {
            this.tags = response.data.data
        }).catch((err) => {
            this.setMessage(err.errorMessage)
        }).finally(() => {
            this.setLoaded();
        })
    }

    onSelected(tag: TagInterface|null) {
        if (this.activeTag !== null && tag !== null && this.activeTag.id === tag.id) {
            return
        }

        this.activeTag = tag;
    }

    onCreated(tag: TagInterface) {
        this.tags.unshift(tag)
    }

    onUpdated(tag: TagInterface) {
        const tags = Array.from<TagInterface>(this.tags)
        const index = tags.findIndex(item => item.id === tag.id)

        if (index === -1) {
            console.warn('Unable to find tag in the list. Tag ID:', tag.id)
            return
        }

        tags[index] = tag

        this.tags = tags
    }

    onDeleted(tag: TagInterface) {
        const tags = Array.from<TagInterface>(this.tags)
        const index = tags.findIndex(item => item.id === tag.id)

        if (index === -1) {
            console.warn('Unable to find tag in the list. Tag ID:', tag.id)
            return
        }

        tags.splice(index, 1)

        this.tags = tags
    }
}
</script>

<style scoped>

</style>
