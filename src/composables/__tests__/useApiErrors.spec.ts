import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AxiosError } from 'axios'
import { useApiErrors } from '../useApiErrors'
import { reportError } from '@/shared/sentry'

vi.mock('@/shared/sentry', () => ({ reportError: vi.fn() }))

vi.mock('@/lang', () => ({
    default: {
        global: {
            t: (key: string) => key,
        },
    },
}))

function makeAxiosError(status: number, data: unknown): AxiosError {
    const err = new AxiosError('Request failed')
    err.response = {
        status,
        data,
        headers: {},
        config: {} as never,
        statusText: String(status),
    }
    return err
}

describe('useApiErrors', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('passes every handled error to reportError, which filters out expected ones', () => {
        const { handleError } = useApiErrors()
        const err = makeAxiosError(500, null)

        handleError(err)

        expect(reportError).toHaveBeenCalledWith(err)
    })

    it('initial state: no errors', () => {
        const { fieldErrors, generalError, generalErrorRaw } = useApiErrors()
        expect(fieldErrors.value).toEqual({})
        expect(generalError.value).toBeNull()
        expect(generalErrorRaw.value).toBeNull()
    })

    it('extracts errors.name[0] from a mock 422 response', () => {
        const { fieldErrors, generalError, handleError } = useApiErrors()

        const err = makeAxiosError(422, {
            errors: { name: ['Name is required', 'Name is too short'] },
        })

        handleError(err)

        expect(fieldErrors.value.name).toEqual(['Name is required', 'Name is too short'])
        expect(fieldErrors.value.name[0]).toBe('Name is required')
        expect(generalError.value).toBeNull()
    })

    it('normalizes Spiral string field errors to arrays', () => {
        const { fieldErrors, generalError, handleError } = useApiErrors()

        handleError(makeAxiosError(422, { errors: { name: 'Value should be unique.' } }))

        expect(fieldErrors.value.name).toEqual(['Value should be unique.'])
        expect(generalError.value).toBeNull()
    })

    it('sets localised generalError when 422 has no parseable field errors', () => {
        const { generalError, handleError } = useApiErrors()

        handleError(makeAxiosError(422, { errors: {} }))

        expect(generalError.value).toBe('validationError')
    })

    it('sets localised generalError when 422 body is unparseable', () => {
        const { generalError, handleError } = useApiErrors()

        handleError(makeAxiosError(422, null))

        expect(generalError.value).toBe('validationError')
    })

    it('sets a distinct localised message for a 409 (duplicate request in flight)', () => {
        const { fieldErrors, generalError, generalErrorRaw, handleError } = useApiErrors()

        const err = makeAxiosError(409, { message: 'Conflict' })
        handleError(err)

        expect(generalError.value).toBe('duplicateRequestError')
        expect(generalError.value).not.toBe('unknownError')
        expect(fieldErrors.value).toEqual({})
        expect(generalErrorRaw.value).toBe(err)
    })

    it('sets the idempotency-conflict message for a 422 with a well-formed body but no errors key', () => {
        const { fieldErrors, generalError, generalErrorRaw, handleError } = useApiErrors()

        // Same key reused with a different body: no `errors` key, so ValidationError.from
        // throws even though the body is well-formed.
        handleError(makeAxiosError(422, { message: 'Idempotency key reused with a different payload' }))

        expect(generalError.value).toBe('idempotencyConflictError')
        expect(generalError.value).not.toBe('validationError')
        expect(fieldErrors.value).toEqual({})
        // Consistent with the other 422 branches: generalErrorRaw is reserved for
        // non-422 failures, not set here.
        expect(generalErrorRaw.value).toBeNull()
    })

    it('still yields the generic validationError for a null 422 body (genuinely unparseable, not idempotency conflict)', () => {
        const { generalError, handleError } = useApiErrors()

        handleError(makeAxiosError(422, null))

        expect(generalError.value).toBe('validationError')
        expect(generalError.value).not.toBe('idempotencyConflictError')
    })

    it('yields the generic validationError, not idempotencyConflictError, for a 422 body with a malformed `errors` key ({ errors: null })', () => {
        const { generalError, handleError } = useApiErrors()

        // `errors` is present, so this is a malformed validation response, not the
        // idempotency 422 shape.
        handleError(makeAxiosError(422, { errors: null }))

        expect(generalError.value).toBe('validationError')
        expect(generalError.value).not.toBe('idempotencyConflictError')
    })

    it('yields the generic validationError, not idempotencyConflictError, for a 422 body with a malformed `errors` key ({ errors: "string" })', () => {
        const { generalError, handleError } = useApiErrors()

        handleError(makeAxiosError(422, { errors: 'not an object' }))

        expect(generalError.value).toBe('validationError')
        expect(generalError.value).not.toBe('idempotencyConflictError')
    })

    it('yields the generic validationError, not idempotencyConflictError, for an array 422 body', () => {
        const { generalError, handleError } = useApiErrors()

        handleError(makeAxiosError(422, ['unexpected', 'array', 'body']))

        expect(generalError.value).toBe('validationError')
        expect(generalError.value).not.toBe('idempotencyConflictError')
    })

    it('sets generic localised error for non-422 HTTP response, does NOT surface raw message', () => {
        const { generalError, handleError } = useApiErrors()

        const err = makeAxiosError(400, { message: 'Bad request' })
        handleError(err)

        expect(generalError.value).toBe('unknownError')
        // raw message must NOT appear in generalError
        expect(generalError.value).not.toBe('Bad request')
    })

    it('sets generic localised error for non-Axios errors', () => {
        const { generalError, handleError } = useApiErrors()

        handleError(new Error('Network failure'))

        expect(generalError.value).toBe('unknownError')
        expect(generalError.value).not.toBe('Network failure')
    })

    it('sets generic localised error for no-response AxiosError', () => {
        const { generalError, handleError } = useApiErrors()

        const err = new AxiosError('Network Error')
        // no err.response — simulates a dropped connection
        handleError(err)

        expect(generalError.value).toBe('unknownError')
    })

    it('422 field errors still populate correctly (behavior unchanged)', () => {
        const { fieldErrors, generalError, handleError } = useApiErrors()

        handleError(makeAxiosError(422, {
            errors: {
                email: ['Invalid email'],
                password: 'Too short',
            },
        }))

        expect(fieldErrors.value.email).toEqual(['Invalid email'])
        expect(fieldErrors.value.password).toEqual(['Too short'])
        expect(generalError.value).toBeNull()
    })

    it('reset() clears all errors', () => {
        const { fieldErrors, generalError, handleError, reset } = useApiErrors()

        handleError(makeAxiosError(422, { errors: { email: ['Invalid'] } }))
        expect(fieldErrors.value.email).toBeDefined()

        reset()

        expect(fieldErrors.value).toEqual({})
        expect(generalError.value).toBeNull()
    })

    it('resets previous errors on new handleError call', () => {
        const { fieldErrors, generalError, handleError } = useApiErrors()

        handleError(makeAxiosError(422, { errors: { name: ['Required'] } }))
        expect(fieldErrors.value.name).toBeDefined()

        handleError(makeAxiosError(400, { message: 'Something else' }))

        expect(fieldErrors.value).toEqual({})
        expect(generalError.value).toBe('unknownError')
    })

    describe('generalErrorRaw exposure', () => {
        it('is set to the raw error for a non-HTTP error', () => {
            const { generalErrorRaw, handleError } = useApiErrors()

            const originalError = new Error('Network failure')
            handleError(originalError)

            expect(generalErrorRaw.value).toBe(originalError)
        })

        it('is set to the raw AxiosError for a non-422 HTTP failure', () => {
            const { generalErrorRaw, handleError } = useApiErrors()

            const err = makeAxiosError(400, { message: 'Bad request' })
            handleError(err)

            expect(generalErrorRaw.value).toBe(err)
        })

        it('is set to the raw AxiosError for a no-response AxiosError', () => {
            const { generalErrorRaw, handleError } = useApiErrors()

            const err = new AxiosError('Network Error')
            handleError(err)

            expect(generalErrorRaw.value).toBe(err)
        })

        it('is set to the raw AxiosError for a 409 (duplicate request in flight)', () => {
            const { generalErrorRaw, handleError } = useApiErrors()

            const err = makeAxiosError(409, { message: 'Conflict' })
            handleError(err)

            expect(generalErrorRaw.value).toBe(err)
        })

        it('stays null for a 422 idempotency-conflict body (well-formed object, no errors key)', () => {
            const { generalErrorRaw, handleError } = useApiErrors()

            handleError(makeAxiosError(422, { message: 'Idempotency key reused with a different payload' }))

            expect(generalErrorRaw.value).toBeNull()
        })

        it('stays null for a 422 with field errors', () => {
            const { generalErrorRaw, handleError } = useApiErrors()

            handleError(makeAxiosError(422, { errors: { name: ['Required'] } }))

            expect(generalErrorRaw.value).toBeNull()
        })

        it('stays null for a 422 with an empty errors object', () => {
            const { generalErrorRaw, handleError } = useApiErrors()

            handleError(makeAxiosError(422, { errors: {} }))

            expect(generalErrorRaw.value).toBeNull()
        })

        it('stays null for an unparseable 422 body', () => {
            const { generalErrorRaw, handleError } = useApiErrors()

            handleError(makeAxiosError(422, null))

            expect(generalErrorRaw.value).toBeNull()
        })

        it('is cleared by reset() after a non-422 failure', () => {
            const { generalErrorRaw, handleError, reset } = useApiErrors()

            handleError(makeAxiosError(500, { message: 'Server error' }))
            expect(generalErrorRaw.value).not.toBeNull()

            reset()

            expect(generalErrorRaw.value).toBeNull()
        })

        it('is reset to null when a subsequent call is a 422', () => {
            const { generalErrorRaw, handleError } = useApiErrors()

            handleError(makeAxiosError(400, { message: 'Bad request' }))
            expect(generalErrorRaw.value).not.toBeNull()

            handleError(makeAxiosError(422, { errors: { name: ['Required'] } }))
            expect(generalErrorRaw.value).toBeNull()
        })
    })

    describe('known/unknown field split (knownFields option)', () => {
        it('without knownFields, behaves exactly like the legacy full-fieldErrors mode', () => {
            const { fieldErrors, generalError, handleError } = useApiErrors()

            handleError(makeAxiosError(422, {
                errors: { name: ['Required'], somethingNotRendered: ['Unexpected'] },
            }))

            expect(fieldErrors.value).toEqual({
                name: ['Required'],
                somethingNotRendered: ['Unexpected'],
            })
            expect(generalError.value).toBeNull()
        })

        it('all errors for known fields populate fieldErrors only, generalError stays null', () => {
            const { fieldErrors, generalError, handleError } = useApiErrors(['name', 'email'])

            handleError(makeAxiosError(422, {
                errors: { name: ['Required'], email: ['Invalid'] },
            }))

            expect(fieldErrors.value).toEqual({ name: ['Required'], email: ['Invalid'] })
            expect(generalError.value).toBeNull()
        })

        it('errors for a field the form does not render go to generalError, not fieldErrors', () => {
            const { fieldErrors, generalError, handleError } = useApiErrors(['name'])

            handleError(makeAxiosError(422, {
                errors: { slug: ['Slug is already taken'] },
            }))

            expect(fieldErrors.value).toEqual({})
            expect(generalError.value).toBe('Slug is already taken')
        })

        it('joins multiple unknown-field messages into generalError', () => {
            const { generalError, handleError } = useApiErrors(['name'])

            handleError(makeAxiosError(422, {
                errors: {
                    slug: ['Slug is already taken'],
                    isPublic: ['Must be a boolean'],
                },
            }))

            expect(generalError.value).toBe('Slug is already taken Must be a boolean')
        })

        it('joins multiple messages for a single unknown field into generalError', () => {
            const { generalError, handleError } = useApiErrors(['name'])

            handleError(makeAxiosError(422, {
                errors: { slug: ['Too short', 'Already taken'] },
            }))

            expect(generalError.value).toBe('Too short Already taken')
        })

        it('mixed known+unknown: known field -> fieldErrors, unknown field -> generalError', () => {
            const { fieldErrors, generalError, handleError } = useApiErrors(['name'])

            handleError(makeAxiosError(422, {
                errors: {
                    name: ['Name is required'],
                    slug: ['Slug is already taken'],
                },
            }))

            expect(fieldErrors.value).toEqual({ name: ['Name is required'] })
            expect(fieldErrors.value.slug).toBeUndefined()
            expect(generalError.value).toBe('Slug is already taken')
        })

        it('empty errors object still yields the legacy t("validationError") regardless of knownFields', () => {
            const { fieldErrors, generalError, handleError } = useApiErrors(['name'])

            handleError(makeAxiosError(422, { errors: {} }))

            expect(fieldErrors.value).toEqual({})
            expect(generalError.value).toBe('validationError')
        })

        it('unparseable 422 body still yields t("validationError") regardless of knownFields', () => {
                const { generalError, handleError } = useApiErrors(['name'])

            handleError(makeAxiosError(422, null))

            expect(generalError.value).toBe('validationError')
            })

        it('non-422 / non-HTTP behaviour is unaffected by knownFields', () => {
            const { generalError, handleError } = useApiErrors(['name'])

            handleError(new Error('Network failure'))

            expect(generalError.value).toBe('unknownError')
        })

        it('reset() clears both fieldErrors and a knownFields-derived generalError', () => {
            const { fieldErrors, generalError, handleError, reset } = useApiErrors(['name'])

            handleError(makeAxiosError(422, { errors: { slug: ['Slug is already taken'] } }))
            expect(generalError.value).toBe('Slug is already taken')

            reset()

            expect(fieldErrors.value).toEqual({})
            expect(generalError.value).toBeNull()
        })
    })
})
