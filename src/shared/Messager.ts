import { Vue, Component } from 'vue-property-decorator'

@Component
export default class Messager extends Vue {
    public message = ''
    public showMessage = false

    public getMessage(): string {
        return this.message
    }

    public shouldDisplayMessage(): boolean {
        return this.showMessage
    }

    public setMessage(msg: string) {
        this.message = msg
        this.showMessage = true
    }

    public resetMessage() {
        this.message = ''
        this.showMessage = false
    }

    get hasMessage(): boolean {
        return this.message !== ''
    }
}