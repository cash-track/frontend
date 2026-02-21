import { Vue, Component } from 'vue-property-decorator'
import { AxiosError } from 'axios';
import {
    ErrorResponseInterface,
    ValidationResponseInterface,
} from '@/api/responses'
import { ErrorWithMessage, toErrorWithMessage, } from '@/shared/errors';

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
        if (msg === undefined) {
            msg = 'Something went wrong. Please, try again later.'
        }

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

    protected dispatchError(error: AxiosError) {
        if (error.response) {
            switch (error.response.status) {
                case 400:
                    // @ts-expect-error no response data declaration
                    this.onBadRequestResponse(error.response.data)
                    break
                case 401:
                    // @ts-expect-error no response data declaration
                    this.onUnauthorisedResponse(error.response.data)
                    break
                case 403:
                    // @ts-expect-error no response data declaration
                    this.onForbiddenResponse(error.response.data)
                    break
                case 422:
                    // @ts-expect-error no response data declaration
                    this.onUnprocessableEntityResponse(error.response.data)
                    break
                case 500:
                    // @ts-expect-error no response data declaration
                    this.onInternalServerError(error.response.data)
                    break
                default:
                    console.info('Unhandled error', error)
                    this.onUnknownError({message: this.$t('unknownError').toString()})
                    break;
            }
        }

        return error
    }

    protected dispatchException(error: unknown) {
        if (error instanceof AxiosError) {
            this.dispatchError(error)
            return
        }

        this.onUnknownError(toErrorWithMessage(error))
    }

    protected onBadRequestResponse(response: ErrorResponseInterface) {
        this.setMessage(response.message)
    }

    protected onUnauthorisedResponse(response: ErrorResponseInterface) {
        this.setMessage(response.message)
    }

    protected onForbiddenResponse(response: ErrorResponseInterface) {
        this.setMessage(response.error ?? response.message)
    }

    protected onUnprocessableEntityResponse(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        response: ValidationResponseInterface
    ) {
        this.setMessage('One or more fields is not valid')
    }

    protected onInternalServerError(response: ErrorResponseInterface) {
        this.setMessage(response.message)
    }

    protected onUnknownError(error: ErrorWithMessage) {
        this.setMessage(error.message)
    }
}