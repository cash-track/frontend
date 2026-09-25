import { ref } from 'vue'
import { AxiosError } from 'axios'
import { ValidationError } from '@/api/models/error'
import i18n from '@/lang'
import { reportError } from '@/shared/sentry'

/**
 * @param knownFields Names of fields the calling form actually renders (i.e. has a
 * `UFormField :error` bound to). When provided, 422 errors for any other key are not
 * dropped — they're joined into `generalError` so they still reach the user via the
 * form's `UAlert`, instead of silently landing in an unrendered `fieldErrors` entry.
 * Omit it (or leave undefined) to keep the legacy behaviour of putting every 422 key
 * straight into `fieldErrors`.
 */
export function useApiErrors(knownFields?: string[]) {
    const knownFieldSet = knownFields ? new Set(knownFields) : null
    const fieldErrors = ref<Record<string, string[]>>({})
    const generalError = ref<string | null>(null)
    // Raw, unformatted error for non-422 failures — lets consumers (LoadErrorAlert) render a
    // "Show details" breakdown. Stays null for every 422 branch, since those are user-facing
    // validation messages, not failures worth a debug dump.
    const generalErrorRaw = ref<unknown>(null)

    function reset(): void {
        fieldErrors.value = {}
        generalError.value = null
        generalErrorRaw.value = null
    }

    function handleError(error: unknown): void {
        reset()
        reportError(error)

        if (!(error instanceof AxiosError) || !error.response) {
            generalError.value = i18n.global.t('unknownError')
            generalErrorRaw.value = error
            return
        }

        const { status, data } = error.response

        // A duplicate-in-flight request gets a plain 409 with no field breakdown — an
        // actionable case of its own, not a generic failure.
        if (status === 409) {
            generalError.value = i18n.global.t('duplicateRequestError')
            generalErrorRaw.value = error
            return
        }

        if (status === 422) {
            try {
                const ve = ValidationError.from(data)

                if (Object.keys(ve.errors).length === 0) {
                    generalError.value = i18n.global.t('validationError')
                } else if (knownFieldSet) {
                    const known: Record<string, string[]> = {}
                    const unknownMessages: string[] = []
                    for (const [field, messages] of Object.entries(ve.errors)) {
                        if (knownFieldSet.has(field)) {
                            known[field] = messages
                        } else {
                            unknownMessages.push(...messages)
                        }
                    }
                    fieldErrors.value = known
                    if (unknownMessages.length > 0) {
                        generalError.value = unknownMessages.join(' ')
                    }
                } else {
                    fieldErrors.value = ve.errors
                }
            } catch {
                // A well-formed object with no `errors` key is the idempotency 422: the same
                // key reused with a different body. A malformed validation body that does
                // carry `errors` keeps the generic validation message instead.
                const isIdempotencyConflict =
                    data !== null &&
                    typeof data === 'object' &&
                    !Array.isArray(data) &&
                    !('errors' in data)

                generalError.value = i18n.global.t(
                    isIdempotencyConflict ? 'idempotencyConflictError' : 'validationError',
                )
            }
            return
        }

        generalError.value = i18n.global.t('unknownError')
        generalErrorRaw.value = error
    }

    return { fieldErrors, generalError, generalErrorRaw, reset, handleError }
}
