<template>
    <div class="common-tags-root">
        <h6>
            Common Tags

            <b-spinner v-if="!loadFailed && isLoading" small></b-spinner>

            <b-icon-exclamation-triangle-fill
                v-if="loadFailed && !isLoading"
                variant="warning"
            ></b-icon-exclamation-triangle-fill>
        </h6>

        <div v-if="!isLoading && !loadFailed" class="list-ltr">
            <tag v-for="tag of tags" :tag="tag" :key="tag.id"></tag>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { TagInterface, tagsGetCommon, TagsResponseInterface } from '@/api/tags'
import Tag from '@/components/tags/Tag.vue'

@Component({
    components: {Tag},
})
export default class CommonTags extends Vue {
    tags: Array<TagInterface>|null = null

    loadFailed = false

    mounted() {
        this.load();
    }

    get isLoading(): boolean {
        return this.tags === null;
    }

    protected load() {
        this.loadFailed = false;

        tagsGetCommon()
            .then(response => {
                this.onLoaded(response.data);

                return response;
            })
            .catch(this.onError);
    }

    protected onLoaded(response: TagsResponseInterface) {
        this.tags = response.data;
    }

    protected onError() {
        this.loadFailed = true;
    }
}
</script>

<style lang="scss" scoped>
.common-tags-root {
    padding-bottom: 20px;
}
</style>
