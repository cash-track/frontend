import Vue from 'vue';
import VueRouter from 'vue-router';

Vue.use(VueRouter);

import LoginPage from './components/LoginPage';

const routes = [
    {
        path: '/login',
        name: 'login',
        component: LoginPage,
        meta: {
            title: 'Login'
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