import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { Charge } from '@/api/models/charge'

export function useChargesGrouping(
    charges: Ref<Charge[]>,
    t: (key: string) => string,
    locale: Ref<string>,
): { chargesGrouped: ComputedRef<Map<string, Charge[]>> } {
    const chargesGrouped = computed(() => {
        const map = new Map<string, Charge[]>()
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        for (const charge of charges.value) {
            const chargeDate = new Date(charge.dateTime)
            chargeDate.setHours(0, 0, 0, 0)

            const diff = Math.floor((today.getTime() - chargeDate.getTime()) / (1000 * 60 * 60 * 24))

            let group: string
            if (diff === 0) {
                group = t('charges.today')
            } else {
                group = chargeDate.toLocaleDateString(locale.value, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                })
            }

            let list = map.get(group)
            if (!list) {
                list = []
                map.set(group, list)
            }
            list.push(charge)
        }

        return map
    })

    return { chargesGrouped }
}
