export default function getEnv(name: string) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    return window?.configs?.[name] || process.env[name]
}
