import { ref } from 'vue'
import { AxiosError } from 'axios'
import { ApiError, ValidationError } from '@/api/models/error'

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
            generalError.value = error instanceof Error ? error.message : 'Unknown error'
            return
        }

        const { status, data } = error.response

        if (status === 422) {
            try {
                const ve = ValidationError.from(data)
                fieldErrors.value = ve.errors
                if (Object.keys(ve.errors).length === 0) {
                    generalError.value = 'One or more fields is not valid'
                }
            } catch {
                generalError.value = 'Validation failed'
            }
            return
        }

        try {
            const ae = ApiError.from(data)
            generalError.value = ae.error ?? ae.message
        } catch {
            generalError.value = 'Something went wrong. Please try again later.'
        }
    }

    return { fieldErrors, generalError, reset, handleError }
}
