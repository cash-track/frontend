<template>
  <div id="app">
    <Header></Header>

    <b-container>
      <router-view/>
    </b-container>

    <Footer></Footer>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";

@Component({
  components: {Header, Footer}
})
export default class App extends Vue{

}

</script>

<style lang="scss">

</style>
