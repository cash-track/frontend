import { Vue, Component } from 'vue-property-decorator'

@Component
export default class Loader extends Vue {
    public loading = false

    public setLoading() {
        this.loading = true
    }

    public setLoaded() {
        this.loading = false
    }

    get isLoading(): boolean {
        return this.loading
    }
}
