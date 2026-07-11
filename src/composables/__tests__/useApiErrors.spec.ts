import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AxiosError } from 'axios'
import { useApiErrors } from '../useApiErrors'

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
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const { generalError, handleError } = useApiErrors()

        handleError(makeAxiosError(422, null))

        expect(generalError.value).toBe('validationError')
        expect(consoleSpy).toHaveBeenCalled()
    })

    it('sets generic localised error for non-422 HTTP response, does NOT surface raw message', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const { generalError, handleError } = useApiErrors()

        const err = makeAxiosError(400, { message: 'Bad request' })
        handleError(err)

        expect(generalError.value).toBe('unknownError')
        expect(consoleSpy).toHaveBeenCalled()
        // raw message must NOT appear in generalError
        expect(generalError.value).not.toBe('Bad request')
    })

    it('logs raw error text to console.error for non-422 HTTP errors', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const { handleError } = useApiErrors()

        handleError(makeAxiosError(403, { message: 'Forbidden', error: 'Access denied' }))

        expect(consoleSpy).toHaveBeenCalled()
        const callArgs = consoleSpy.mock.calls[0]
        expect(callArgs.some(a => typeof a === 'string' && a.includes('Access denied'))).toBe(true)
    })

    it('sets generic localised error for non-Axios errors', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const { generalError, handleError } = useApiErrors()

        handleError(new Error('Network failure'))

        expect(generalError.value).toBe('unknownError')
        expect(generalError.value).not.toBe('Network failure')
        expect(consoleSpy).toHaveBeenCalled()
    })

    it('logs raw error object to console.error for non-Axios errors', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const { handleError } = useApiErrors()

        const originalError = new Error('Network failure')
        handleError(originalError)

        expect(consoleSpy).toHaveBeenCalledWith('[useApiErrors] non-HTTP error:', originalError)
    })

    it('sets generic localised error for no-response AxiosError', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const { generalError, handleError } = useApiErrors()

        const err = new AxiosError('Network Error')
        // no err.response — simulates a dropped connection
        handleError(err)

        expect(generalError.value).toBe('unknownError')
        expect(consoleSpy).toHaveBeenCalled()
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
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const { fieldErrors, generalError, handleError } = useApiErrors()

        handleError(makeAxiosError(422, { errors: { name: ['Required'] } }))
        expect(fieldErrors.value.name).toBeDefined()

        handleError(makeAxiosError(400, { message: 'Something else' }))

        expect(fieldErrors.value).toEqual({})
        expect(generalError.value).toBe('unknownError')
        expect(consoleSpy).toHaveBeenCalled()
    })

    describe('generalErrorRaw exposure', () => {
        it('is set to the raw error for a non-HTTP error', () => {
            vi.spyOn(console, 'error').mockImplementation(() => {})
            const { generalErrorRaw, handleError } = useApiErrors()

            const originalError = new Error('Network failure')
            handleError(originalError)

            expect(generalErrorRaw.value).toBe(originalError)
        })

        it('is set to the raw AxiosError for a non-422 HTTP failure', () => {
            vi.spyOn(console, 'error').mockImplementation(() => {})
            const { generalErrorRaw, handleError } = useApiErrors()

            const err = makeAxiosError(400, { message: 'Bad request' })
            handleError(err)

            expect(generalErrorRaw.value).toBe(err)
        })

        it('is set to the raw AxiosError for a no-response AxiosError', () => {
            vi.spyOn(console, 'error').mockImplementation(() => {})
            const { generalErrorRaw, handleError } = useApiErrors()

            const err = new AxiosError('Network Error')
            handleError(err)

            expect(generalErrorRaw.value).toBe(err)
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
            vi.spyOn(console, 'error').mockImplementation(() => {})
            const { generalErrorRaw, handleError } = useApiErrors()

            handleError(makeAxiosError(422, null))

            expect(generalErrorRaw.value).toBeNull()
        })

        it('is cleared by reset() after a non-422 failure', () => {
            vi.spyOn(console, 'error').mockImplementation(() => {})
            const { generalErrorRaw, handleError, reset } = useApiErrors()

            handleError(makeAxiosError(500, { message: 'Server error' }))
            expect(generalErrorRaw.value).not.toBeNull()

            reset()

            expect(generalErrorRaw.value).toBeNull()
        })

        it('is reset to null when a subsequent call is a 422', () => {
            vi.spyOn(console, 'error').mockImplementation(() => {})
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
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            const { generalError, handleError } = useApiErrors(['name'])

            handleError(makeAxiosError(422, null))

            expect(generalError.value).toBe('validationError')
            expect(consoleSpy).toHaveBeenCalled()
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
