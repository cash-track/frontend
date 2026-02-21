

export default function getEnv(name: string) {

    import.meta.env.VITE_WEBSITE_URL
    // @ts-expect-error no configs type
    return window?.configs?.[name] || process.env[name]
}
