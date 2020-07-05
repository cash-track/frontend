<template>
    <div class="row">
        <div class="col-md-8 ml-md-auto mr-md-auto">
            <Login></Login>
        </div>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator';
    import Login from '@/components/Auth/Login.vue'

    @Component({
        components: {Login}
    })
    export default class LoginView extends Vue {

    }
</script>

<style scoped lang="scss">

</style>
