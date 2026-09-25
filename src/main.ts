import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ui from '@nuxt/ui/vue-plugin'

import App from './App.vue'
import router from './router'
import i18n from './lang'
import { setupPWA } from './pwa'
import { initSentry } from './shared/sentry'

import './assets/main.css'

const app = createApp(App)

initSentry(app)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(ui)

app.mount('#app')

setupPWA()
