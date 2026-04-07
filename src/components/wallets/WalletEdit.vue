<script setup lang="ts">
import { reactive, shallowRef, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { updateWallet, deleteWallet } from '@/api/wallets'
import { getFeaturedCurrencies } from '@/api/currency'
import type { Currency } from '@/api/models/currency'
import type { Wallet } from '@/api/models/wallet'
import { useApiErrors } from '@/composables/useApiErrors'
import { useNotifications } from '@/composables/useNotifications'
import { useWalletsStore } from '@/stores/wallets'
import ConfirmModal from '@/components/Shared/ConfirmModal.vue'

const props = defineProps<{ wallet: Wallet }>()

const { t } = useI18n()
const router = useRouter()
const walletsStore = useWalletsStore()
const { fieldErrors, generalError, handleError, reset } = useApiErrors()
const { notifySuccess } = useNotifications()

const form = reactive({
    name: props.wallet.name,
    defaultCurrencyCode: props.wallet.defaultCurrencyCode ?? '',
    isPublic: props.wallet.isPublic,
})

const currencies = shallowRef<Currency[]>([])
const loading = shallowRef(false)
const deleteConfirmOpen = shallowRef(false)
const deleting = shallowRef(false)

const currencyOptions = computed(() =>
    currencies.value.map(c => ({ label: `${c.code} — ${c.name}`, value: c.code })),
)

watch(() => props.wallet, (wallet) => {
    form.name = wallet.name
    form.defaultCurrencyCode = wallet.defaultCurrencyCode ?? ''
    form.isPublic = wallet.isPublic
})

onMounted(async () => {
    try {
        currencies.value = await getFeaturedCurrencies()
    } catch {
        // non-fatal
    }
})

async function onSubmit() {
    reset()
    loading.value = true
    try {
        await updateWallet(props.wallet.id, {
            name: form.name,
            isPublic: form.isPublic,
            defaultCurrencyCode: form.defaultCurrencyCode,
        })
        await walletsStore.loadActive()
        notifySuccess(t('wallets.editTitle'))
        router.push({ name: 'wallets.show', params: { walletID: props.wallet.id.toString() } })
    } catch (error) {
        handleError(error)
    } finally {
        loading.value = false
    }
}

async function onDelete() {
    deleting.value = true
    try {
        await deleteWallet(props.wallet.id)
        await walletsStore.loadActive()
        router.push({ name: 'wallets' })
    } catch (error) {
        handleError(error)
        deleteConfirmOpen.value = false
    } finally {
        deleting.value = false
    }
}
</script>

<template>
    <UCard>
        <template #header>
            <div class="flex justify-between items-center">
                <h2 class="font-semibold text-lg">{{ t('wallets.editTitle') }}</h2>
                <UButton
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    :label="t('wallets.delete')"
                    @click="deleteConfirmOpen = true"
                />
            </div>
        </template>

        <div class="space-y-4">
            <UFormField :label="t('wallets.formName')" :error="fieldErrors.name?.[0]" required>
                <UInput
                    v-model="form.name"
                    :disabled="loading"
                    :placeholder="t('wallets.formName')"
                    class="w-full"
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
                />
            </UFormField>

            <UFormField :label="t('wallets.formIsPublic')">
                <USwitch v-model="form.isPublic" :disabled="loading" />
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
                    :to="{ name: 'wallets.show', params: { walletID: wallet.id.toString() } }"
                    :disabled="loading"
                />
                <UButton
                    :label="t('wallets.update')"
                    :loading="loading"
                    :disabled="!form.name || !form.defaultCurrencyCode"
                    @click="onSubmit"
                />
            </div>
        </template>
    </UCard>

    <ConfirmModal
        v-model:open="deleteConfirmOpen"
        :title="t('wallets.delete')"
        :description="t('wallets.deletingConfirm')"
        :confirm-label="t('wallets.delete')"
        :cancel-label="t('wallets.cancel')"
        :loading="deleting"
        @confirm="onDelete"
    />
</template>
