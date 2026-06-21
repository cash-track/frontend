import { ref } from 'vue'
import { AxiosError } from 'axios'
import { ApiError, ValidationError } from '@/api/models/error'
import i18n from '@/lang'

export function useApiErrors() {
    const fieldErrors = ref<Record<string, string[]>>({})
    const generalError = ref<string | null>(null)

    function reset(): void {
        fieldErrors.value = {}
        generalError.value = null
    }

    function handleError(error: unknown): void {
        reset()

        if (!(error instanceof AxiosError) || !error.response) {
            console.error('[useApiErrors] non-HTTP error:', error)
            generalError.value = i18n.global.t('unknownError')
            return
        }

        const { status, data } = error.response

        if (status === 422) {
            try {
                const ve = ValidationError.from(data)
                fieldErrors.value = ve.errors
                if (Object.keys(ve.errors).length === 0) {
                    generalError.value = i18n.global.t('validationError')
                }
            } catch (parseError) {
                console.error('[useApiErrors] HTTP error', 422, parseError)
                generalError.value = i18n.global.t('validationError')
            }
            return
        }

        try {
            const ae = ApiError.from(data)
            console.error('[useApiErrors] HTTP error', status, ae.error ?? ae.message)
        } catch (parseError) {
            console.error('[useApiErrors] HTTP error', status, parseError)
        }
        generalError.value = i18n.global.t('unknownError')
    }

    return { fieldErrors, generalError, reset, handleError }
}
