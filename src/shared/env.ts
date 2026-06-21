/**
 * Config access for the SPA.
 *
 * Values resolve **at runtime** from `window.__APP_CONFIG__`, which `entrypoint.sh`
 * populates from container env vars when the container starts — this lets a single
 * built image serve every environment (dev/staging/prod) without rebuilding.
 *
 * When that object is absent or still holds an unreplaced `__VITE_*__` placeholder
 * (local `vite dev`, `vite preview`, unit tests), we fall back to Vite's build-time
 * `import.meta.env`, which is populated from `.env`.
 */
function runtimeConfigValue(name: keyof ImportMetaEnv): string | undefined {
    if (typeof window === 'undefined') {
        return undefined
    }
    const value = window.__APP_CONFIG__?.[name]
    // Unset, empty, or an unreplaced `__VITE_*__` placeholder → treat as not provided.
    if (typeof value !== 'string' || value === '' || value.startsWith('__VITE_')) {
        return undefined
    }
    return value
}

export function getEnv(name: keyof ImportMetaEnv): string {
    const runtimeValue = runtimeConfigValue(name)
    if (runtimeValue !== undefined) {
        return runtimeValue
    }
    const val = import.meta.env[name]
    return typeof val === 'string' ? val : ''
}
