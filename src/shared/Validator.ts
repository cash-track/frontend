import { Vue, Component } from 'vue-property-decorator'
import { ValidationResponseInterface } from '@/api/responses'

@Component({
    data: () => {
        return {
            validationMessages: Object.create({}),
        }
    }
})
export default class Validator extends Vue {
    public validationMessages!: Record<string, string>

    public resetValidationMessages() {
        this.validationMessages = {}
    }

    public resetValidationMessage(field: string) {
        if (!this.hasValidationMessage(field)) {
            return
        }

        this.validationMessages[field] = ''
    }

    public hasValidationMessage(field: string): boolean {
        if (typeof this.validationMessages !== 'object') {
            this.resetValidationMessages()
        }

        return (
            Object.keys(this.validationMessages).filter(key => key === field).length > 0 && this.validationMessages[field] !== ""
        )
    }

    /**
     * Used on bootstrap validation state
     */
    public validationState(fields: string | Array<string>): boolean | null {
        if (typeof fields === 'string') {
            fields = [fields]
        }

        for (const field of fields) {
            if (! this.hasValidationMessage(field)) {
                continue
            }

            return false
        }

        return null
    }

    public validationMessage(fields: string | Array<string>, separator = ','): string {
        const message = []

        if (typeof fields === 'string') {
            fields = [fields]
        }

        for (const field of fields) {
            if (! this.hasValidationMessage(field)) {
                continue
            }

            message.push(this.validationMessages[field])
        }

        return message.join(separator)
    }

    public setValidationMessages(msgs: Record<string, string>) {
        this.validationMessages = msgs
    }

    public setValidationMessage(field: string, msg: string) {
        this.hasValidationMessage(field)
        this.validationMessages[field] = msg
    }

    protected onUnprocessableEntityResponse(
        response: ValidationResponseInterface
    ) {
        this.setValidationMessages(response.errors)
    }
}