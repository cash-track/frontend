import Vue from 'vue'
import { BootstrapVue, BootstrapVueIcons } from 'bootstrap-vue'
import VueVisibilityTrigger from 'vue-visibility-trigger'
import VueMoment from 'vue-moment'
import moment from 'moment';
import 'moment/locale/uk';

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import ClickOutside from 'vue-click-outside'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

import App from './App.vue'
import './registerServiceWorker'
import router from './router'
import store from './store'
import { money } from './shared/numbers'
import i18n from './lang'

Vue.config.productionTip = false

Vue.use(BootstrapVue)
Vue.use(BootstrapVueIcons)
Vue.use(VueMoment, {moment});

Vue.component('vue-visibility-trigger', VueVisibilityTrigger)

Vue.filter('money', money)

Vue.directive('click-outside', ClickOutside)

new Vue({
  router,
  store,
  i18n,
  render: h => h(App)
}).$mount('#app')
