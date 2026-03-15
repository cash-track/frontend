import { describe, it, expect } from 'vitest'
import { AxiosError } from 'axios'
import { useApiErrors } from '../useApiErrors'

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
    it('initial state: no errors', () => {
        const { fieldErrors, generalError } = useApiErrors()
        expect(fieldErrors.value).toEqual({})
        expect(generalError.value).toBeNull()
    })

    it('extracts errors.name[0] from a mock 422 response', () => {
        const { fieldErrors, generalError, handleError } = useApiErrors()

        const err = makeAxiosError(422, {
            errors: { name: ['Name is required', 'Name is too short'] },
        })

        handleError(err)

        expect(fieldErrors.value.name).toEqual(['Name is required', 'Name is too short'])
        expect(fieldErrors.value.name[0]).toBe('Name is required')
        expect(generalError.value).toBe('One or more fields is not valid')
    })

    it('extracts generalError from 400 response', () => {
        const { generalError, handleError } = useApiErrors()

        const err = makeAxiosError(400, { message: 'Bad request' })
        handleError(err)

        expect(generalError.value).toBe('Bad request')
        expect(Object.keys(useApiErrors().fieldErrors.value)).toHaveLength(0)
    })

    it('extracts error field over message on 403 response', () => {
        const { generalError, handleError } = useApiErrors()

        const err = makeAxiosError(403, { message: 'Forbidden', error: 'Access denied' })
        handleError(err)

        expect(generalError.value).toBe('Access denied')
    })

    it('handles non-Axios errors', () => {
        const { generalError, handleError } = useApiErrors()

        handleError(new Error('Network failure'))

        expect(generalError.value).toBe('Network failure')
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
        expect(generalError.value).toBe('Something else')
    })
})
