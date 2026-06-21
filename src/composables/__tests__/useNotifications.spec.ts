import { describe, it, expect, vi } from 'vitest'
import { useNotifications } from '../useNotifications'

const mockAdd = vi.fn()

vi.mock('@nuxt/ui/composables', () => ({
    useToast: () => ({ add: mockAdd }),
}))

describe('useNotifications', () => {
    it('notifySuccess calls toast.add with success color', () => {
        const { notifySuccess } = useNotifications()
        notifySuccess('Saved successfully')

        expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Saved successfully',
                color: 'success',
            }),
        )
    })

    it('notifyError calls toast.add with error color', () => {
        const { notifyError } = useNotifications()
        notifyError('Something went wrong')

        expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Something went wrong',
                color: 'error',
            }),
        )
    })
})
