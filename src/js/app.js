import Vue from 'vue';
import Vuetify from 'vuetify';
import router from './router';
import store from './store/store';

Vue.use(Vuetify);

const files = require.context('./', true, /\.vue$/i);
files.keys().map(key => Vue.component(key.split('/').pop().split('.')[0], files(key).default));

const app = new Vue({
    router,
    store,
}).$mount('#app');
