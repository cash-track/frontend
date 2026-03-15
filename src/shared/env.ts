export function getEnv(name: keyof ImportMetaEnv): string {
    const val = import.meta.env[name]
    return typeof val === 'string' ? val : ''
}
