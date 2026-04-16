<script setup lang="ts">
import { reactive, shallowRef, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { createWallet } from '@/api/wallets'
import { getFeaturedCurrencies } from '@/api/currency'
import type { Currency } from '@/api/models/currency'
import { useApiErrors } from '@/composables/useApiErrors'
import { useNotifications } from '@/composables/useNotifications'
import { useProfileStore } from '@/stores/profile'
import { useWalletsStore } from '@/stores/wallets'

const { t } = useI18n()
const router = useRouter()
const profileStore = useProfileStore()
const walletsStore = useWalletsStore()
const { fieldErrors, generalError, handleError, reset } = useApiErrors()
const { notifySuccess } = useNotifications()

const form = reactive({
    name: '',
    defaultCurrencyCode: profileStore.profile?.defaultCurrencyCode ?? '',
})

const currencies = shallowRef<Currency[]>([])
const loading = shallowRef(false)

const currencyOptions = computed(() =>
    currencies.value.map(c => ({ label: `${c.code} — ${c.name}`, value: c.code })),
)

onMounted(async () => {
    try {
        currencies.value = await getFeaturedCurrencies()
        if (!form.defaultCurrencyCode && currencies.value.length > 0) {
            form.defaultCurrencyCode = currencies.value[0].code
        }
    } catch {
        // non-fatal — select stays empty
    }
})

function makeSlug(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 64) || 'wallet'
}

async function onSubmit() {
    reset()
    loading.value = true
    try {
        const wallet = await createWallet({
            name: form.name,
            slug: makeSlug(form.name),
            defaultCurrencyCode: form.defaultCurrencyCode,
        })
        await walletsStore.loadActive()
        notifySuccess(t('wallets.createTitle'))
        router.push({ name: 'wallets.show', params: { walletID: wallet.id.toString() } })
    } catch (error) {
        handleError(error)
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <UCard>
        <template #header>
            <h2 class="font-semibold text-lg">{{ t('wallets.createTitle') }}</h2>
        </template>

        <div class="space-y-4">
            <UFormField :label="t('wallets.formName')" :error="fieldErrors.name?.[0]" required>
                <UInput
                    v-model="form.name"
                    :disabled="loading"
                    :placeholder="t('wallets.formName')"
                    class="w-full"
                    size="lg"
                />
            </UFormField>

            <UFormField
                :label="t('wallets.formCurrency')"
                :description="t('wallets.formCurrencyDescription')"
                :error="fieldErrors.defaultCurrencyCode?.[0]"
                required
            >
                <USelect
                    v-model="form.defaultCurrencyCode"
                    :items="currencyOptions"
                    :disabled="loading"
                    class="w-full"
                    size="lg"
                />
            </UFormField>

            <UAlert
                v-if="generalError"
                color="error"
                :description="generalError"
                icon="i-lucide-alert-circle"
            />
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <UButton
                    variant="ghost"
                    :label="t('wallets.cancel')"
                    :to="{ name: 'wallets' }"
                    :disabled="loading"
                />
                <UButton
                    :label="t('wallets.create')"
                    :loading="loading"
                    :disabled="!form.name || !form.defaultCurrencyCode"
                    @click="onSubmit"
                />
            </div>
        </template>
    </UCard>
</template>
