import axios, {AxiosInstance} from 'axios';

export function client(): AxiosInstance {
    return axios.create({
        baseURL: process.env.VUE_APP_WEBSITE_URL,
        withCredentials: true,
    })
}
