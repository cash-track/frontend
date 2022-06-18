import Vue from 'vue'
import { BootstrapVue, BootstrapVueIcons } from 'bootstrap-vue'
import VueVisibilityTrigger from 'vue-visibility-trigger'
import VueMoment from 'vue-moment'

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

Vue.config.productionTip = false

Vue.use(BootstrapVue)
Vue.use(BootstrapVueIcons)
Vue.use(VueMoment);

Vue.component('vue-visibility-trigger', VueVisibilityTrigger)

Vue.filter('money', money)

Vue.directive('click-outside', ClickOutside)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
