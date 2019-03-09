import Vue from 'vue';
import VueMDCAdapter from 'vue-mdc-adapter';
import router from './router';
import store from './store/store';

Vue.use(VueMDCAdapter);

const files = require.context('./', true, /\.vue$/i);
files.keys().map(key => Vue.component(key.split('/').pop().split('.')[0], files(key).default));

const app = new Vue({
    router,
    store,
}).$mount('#app');
