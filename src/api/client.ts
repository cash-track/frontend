import axios, { AxiosInstance } from 'axios';
import { webSiteLink } from '@/shared/links';
import getEnv from '@/shared/env';

export function client(): AxiosInstance {
    const instance = axios.create({
        baseURL: getEnv('VUE_APP_GATEWAY_URL'),
        withCredentials: true,
    })

    // FIXME. Use events into Vue instance to handle forced logout in one place
    instance.interceptors.response.use(response => {
        if (response.status === 401) {
            window.location.href = webSiteLink('/login');
        }

        return response;
    }, function (error) {
        if (error.response && error.response.status === 401) {
            window.location.href = webSiteLink('/login');
        }

        return Promise.reject(error);
    });

    return instance;
}
