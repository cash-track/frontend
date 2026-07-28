// Kept import-free so e2e/ can import this without dragging in env.ts's
// ambient types (not visible under e2e/tsconfig.json's isolated program).

// vueuse ('auto'|'light'|'dark') <-> cookie ('system'|'light'|'dark')
export function fromCookieValue(raw: string): string {
    return raw === 'system' ? 'auto' : raw
}

export function toCookieValue(value: string): string {
    return value === 'auto' ? 'system' : value
}
