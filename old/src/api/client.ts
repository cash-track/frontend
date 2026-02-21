import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { webSiteLink } from '@/shared/links';
import getEnv from '@/shared/env';

export class Repository {
    protected client: AxiosInstance;

    constructor(instance: AxiosInstance|undefined = undefined) {
        this.client = instance ?? client();
    }

    csrf() {
        return this.client.get('/csrf')
    }
}

class CsrfError extends Error {
    constructor(error: Error) {
        super(error.message);
        this.name = 'CsrfError';
        this.stack = error.stack;
    }
}

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

        if (error.response && error.response.status === 417) {
            return Promise.reject(new CsrfError(error));
        }

        return Promise.reject(error);
    });

    return instance;
}

export function ApiCall() {
    // eslint-disable-next-line
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const callback = descriptor.value;

        // eslint-disable-next-line
        descriptor.value = function (...args: any[]) {
            return call((repository: Repository) => {
                return callback.apply(repository, args);
            })
        }

        return descriptor;
    };
}

export async function call<T = AxiosResponse>(callback: CallableFunction): Promise<T> {
    const instance: AxiosInstance = client();
    const repository: Repository = new Repository(instance);

    try {
        return await callback(repository)
    } catch (error) {
        // skip CSRF checks for non-mutable requests
        if (error instanceof AxiosError && error.config && ['GET', 'OPTIONS'].includes(error.config.method ?? '')) {
            return Promise.reject(error);
        }

        if (! (error instanceof CsrfError)) {
            return Promise.reject(error);
        }

        return await performCsrfRetry<T>(repository, callback);
    }
}

async function performCsrfRetry<T = AxiosResponse>(repository: Repository, callback: CallableFunction): Promise<T> {
    let hasTokenRefreshed = false;

    try {
        hasTokenRefreshed = await refreshCsrfToken(repository)
    } catch (refreshError) {
        // in case an error have happened on refreshing CSRF token
        // this might be a temporary issue, so page refresh should be taken
        window.location.reload();

        return Promise.reject(refreshError);
    }

    if (hasTokenRefreshed) {
        // retry original request
        return await callback(repository);
    }

    // if refresh CSRF token is not successful, most likely authentication got expired
    // so user should be redirected to a login page
    window.location.href = webSiteLink('/login');

    return Promise.reject();
}

async function refreshCsrfToken(repository: Repository) {
    try {
        const response = await repository.csrf()
        return Promise.resolve<boolean>(response.status === 200)
    } catch (error) {
        if (error instanceof AxiosError && error.response && error.response.status === 401) {
            return Promise.resolve<boolean>(false);
        }
        return Promise.reject(error);
    }
}
