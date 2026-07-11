import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PasskeysSettings from '../PasskeysSettings.vue'
import { Passkey } from '@/api/models/passkey'

const { mockGetPasskeys, mockInitPasskey, mockStorePasskey } = vi.hoisted(() => ({
    mockGetPasskeys: vi.fn(),
    mockInitPasskey: vi.fn(),
    mockStorePasskey: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: { value: 'en' },
    }),
}))

vi.mock('@/api/profile/passkeys', () => ({
    getPasskeys: mockGetPasskeys,
    initPasskey: mockInitPasskey,
    storePasskey: mockStorePasskey,
}))

vi.mock('@simplewebauthn/browser', () => ({
    browserSupportsWebAuthn: () => true,
    startRegistration: vi.fn(),
    WebAuthnError: class WebAuthnError extends Error {},
}))

const alertStub = {
    template: '<div class="u-alert" :data-color="color" :data-variant="variant">{{ description }}</div>',
    props: ['color', 'variant', 'description', 'icon'],
}

const globalStubs = {
    global: {
        stubs: {
            UInput: {
                template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
                props: ['modelValue', 'placeholder', 'disabled', 'class'],
                emits: ['update:modelValue'],
            },
            UButton: {
                template: '<button :disabled="disabled || loading" @click="$emit(\'click\')">{{ label }}</button>',
                props: ['label', 'loading', 'disabled'],
                emits: ['click'],
            },
            // Nuxt UI derives component names from filenames; provide both U* and bare-name keys
            UAlert: alertStub,
            Alert: alertStub,
            UIcon: { template: '<span />', props: ['name', 'class'] },
            Icon: { template: '<span />', props: ['name', 'class'] },
            PasskeyItem: { template: '<div />', props: ['passkey'], emits: ['deleted'] },
        },
    },
}

function makePasskey(): Passkey {
    return new Passkey({
        id: 1,
        name: 'Test Key',
        createdAt: new Date('2024-06-01T00:00:00Z'),
        usedAt: null,
    })
}

describe('PasskeysSettings', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        mockGetPasskeys.mockResolvedValue([])
    })

    it('renders info UAlert with variant="subtle" when WebAuthn is supported', async () => {
        const wrapper = mount(PasskeysSettings, globalStubs)
        // allow onMounted to settle
        await wrapper.vm.$nextTick()

        const alerts = wrapper.findAll('.u-alert')
        const infoAlert = alerts.find(a => a.attributes('data-color') === 'info')
        expect(infoAlert).toBeTruthy()
        expect(infoAlert!.attributes('data-variant')).toBe('subtle')
    })

    it('sets addError to localized key (not raw error.message) when a non-WebAuthn error is thrown', async () => {
        const wrapper = mount(PasskeysSettings, globalStubs)
        await wrapper.vm.$nextTick()

        const vm = wrapper.vm as unknown as {
            keyName: string
            onAddPasskey: () => Promise<void>
            addError: string | null
        }

        mockInitPasskey.mockRejectedValue(new Error('Unexpected token in JSON'))

        vm.keyName = 'My key'
        await vm.onAddPasskey()

        // Must be the i18n key, NOT the raw error.message
        expect(vm.addError).toBe('passkeySettings.addClientError')
        expect(vm.addError).not.toBe('Unexpected token in JSON')
    })

    it('shows a retryable LoadErrorAlert when loading passkeys fails, and reloads on retry', async () => {
        mockGetPasskeys.mockReset()
        mockGetPasskeys.mockRejectedValueOnce(new Error('network error'))
        mockGetPasskeys.mockResolvedValue([makePasskey()])

        const wrapper = mount(PasskeysSettings, globalStubs)
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        const alert = wrapper.findComponent({ name: 'LoadErrorAlert' })
        expect(alert.exists()).toBe(true)
        expect(alert.props('retryable')).toBe(true)

        const vm = wrapper.vm as unknown as { failed: boolean; passkeys: Passkey[] }
        expect(vm.failed).toBe(true)

        await alert.vm.$emit('retry')
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        expect(mockGetPasskeys).toHaveBeenCalledTimes(2)
        expect(vm.failed).toBe(false)
        expect(vm.passkeys).toHaveLength(1)
    })

    it('appends stored passkey to list on success', async () => {
        const stored = makePasskey()
        mockInitPasskey.mockResolvedValue({ data: btoa(JSON.stringify({})), challenge: 'ch' })
        const { startRegistration } = await import('@simplewebauthn/browser')
        ;(startRegistration as ReturnType<typeof vi.fn>).mockResolvedValue({})
        mockStorePasskey.mockResolvedValue(stored)

        const wrapper = mount(PasskeysSettings, globalStubs)
        await wrapper.vm.$nextTick()

        const vm = wrapper.vm as unknown as {
            keyName: string
            onAddPasskey: () => Promise<void>
            passkeys: Passkey[]
        }

        vm.keyName = 'My key'
        await vm.onAddPasskey()

        expect(vm.passkeys).toHaveLength(1)
        expect(vm.passkeys[0].name).toBe('Test Key')
    })
})
