<template>
    <div class="row">
        <div class="col-md-8 ml-md-auto mr-md-auto">
            <Register></Register>
        </div>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator';
    import Register from '@/components/Auth/Register.vue'

    @Component({
        components: {Register},
    })
    export default class RegisterView extends Vue {
        
    }
</script>

<style scoped lang="scss">

</style>
