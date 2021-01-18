import { Vue, Component } from 'vue-property-decorator'

@Component
export default class Loader extends Vue {

    // FIXME. Here is a temporary trick to support reactivity of Map for Vue2 using *Updated counter properties.
    //        Upgrade this functionality on switch to Vue3.

    public loadingFlags: Map<string, boolean> = new Map<string, boolean>()

    protected loadingFlagsUpdated = 0

    public loadingFailed: Map<string, string> = new Map<string, string>()

    protected loadingFailedUpdated = 0

    // Loading flags methods
    public setLoading() {
        this.setLoadingFor('')
    }

    public setLoadingFor(key: string) {
        this.loadingFlags.set(key, true)
        this.loadingFlagsUpdated++
    }

    public setLoaded() {
        this.setLoadedFor('')
    }

    public setLoadedFor(key: string) {
        this.loadingFlags.set(key, false)
        this.loadingFlagsUpdated++
    }

    public isLoadingFor(key: string): boolean {
        this.loadingFlagsUpdated

        if (! this.loadingFlags.has(key)) {
            return false
        }

        return this.loadingFlags.get(key) as boolean
    }

    get isLoading(): boolean {
        return this.isLoadingFor('')
    }

    // Loading failed messages methods
    public setLoadingFailedMessage(message: string) {
        this.setLoadingFailedMessageFor('', message)
    }

    public setLoadingFailedMessageFor(key: string, message: string) {
        this.loadingFailed.set(key, message)
        this.loadingFailedUpdated++
    }

    public resetAllLoadingFailedMessages() {
        this.loadingFailed = new Map<string, string>()
        this.loadingFailedUpdated++
    }

    public resetLoadingFailedMessage() {
        this.resetLoadingFailedMessageFor('')
    }

    public resetLoadingFailedMessageFor(key: string) {
        this.loadingFailed.delete(key)
        this.loadingFailedUpdated++
    }

    public hasLoadingFailedMessage(): boolean {
        return this.hasLoadingFailedMessageFor('')
    }

    public hasLoadingFailedMessageFor(key: string): boolean {
        this.loadingFailedUpdated
        return this.loadingFailed.has(key)
    }

    public getLoadingFailedMessage(): string {
        return this.getLoadingFailedMessageFor('')
    }

    public getLoadingFailedMessageFor(key: string): string {
        if (! this.hasLoadingFailedMessageFor(key)) {
            return ''
        }

        return this.loadingFailed.get(key) as string
    }

    get isLoadingFailed(): boolean {
        return this.hasLoadingFailedMessage()
    }
}
