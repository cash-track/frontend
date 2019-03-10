import Vue from 'vue';
import VueRouter from 'vue-router';

Vue.use(VueRouter);

import ExampleComponent from './components/ExampleComponent';

const routes = [
    {
        path: '/example',
        name: 'example',
        component: ExampleComponent,
        meta: {
            title: 'Example'
        }
    }
];

const router = new VueRouter({
    mode: 'history',
    routes,
});

router.beforeEach((to, from, next) => {
    document.title = to.meta.title ? `${to.meta.title} - Cash Track` : 'Cash Track';
    next();
});

export default router;