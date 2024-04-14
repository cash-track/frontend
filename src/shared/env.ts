export default function getEnv(name: string) {
    // @ts-expect-error no configs type
    return window?.configs?.[name] || process.env[name]
}
