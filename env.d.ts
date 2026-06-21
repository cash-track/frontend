/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
interface ViteTypeOptions {
    // By adding this line, you can make the type of ImportMetaEnv strict
    // to disallow unknown keys.
    strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
    readonly VITE_WEBSITE_URL: string
    readonly VITE_GATEWAY_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

interface Window {
    // Runtime config injected by entrypoint.sh into index.html at container start.
    // See src/shared/env.ts (getEnv) for resolution and fallback behaviour.
    __APP_CONFIG__?: Partial<Record<keyof ImportMetaEnv, string>>
}
