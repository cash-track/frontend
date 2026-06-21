import { useToast } from '@nuxt/ui/composables'

export function useNotifications() {
    const toast = useToast()

    function notifySuccess(msg: string): void {
        toast.add({
            title: msg,
            color: 'success',
            icon: 'i-lucide-check-circle',
        })
    }

    function notifyError(msg: string): void {
        toast.add({
            title: msg,
            color: 'error',
            icon: 'i-lucide-x-circle',
        })
    }

    return { notifySuccess, notifyError }
}
