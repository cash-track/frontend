export function requireString(obj: Record<string, unknown>, key: string): string {
    const val = obj[key]
    if (typeof val !== 'string') {
        throw new Error(`Expected string for key "${key}", got ${typeof val}`)
    }
    return val
}

export function requireNumber(obj: Record<string, unknown>, key: string): number {
    const val = obj[key]
    if (typeof val !== 'number') {
        throw new Error(`Expected number for key "${key}", got ${typeof val}`)
    }
    return val
}

export function requireBoolean(obj: Record<string, unknown>, key: string): boolean {
    const val = obj[key]
    if (typeof val !== 'boolean') {
        throw new Error(`Expected boolean for key "${key}", got ${typeof val}`)
    }
    return val
}

export function requireDate(obj: Record<string, unknown>, key: string): Date {
    const val = obj[key]
    if (typeof val !== 'string' && !(val instanceof Date)) {
        throw new Error(`Expected date string for key "${key}", got ${typeof val}`)
    }
    const date = new Date(val as string)
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date value for key "${key}": ${val}`)
    }
    return date
}

export function optionalString(obj: Record<string, unknown>, key: string): string | null {
    const val = obj[key]
    if (val === null || val === undefined) {
        return null
    }
    if (typeof val !== 'string') {
        throw new Error(`Expected string or null for key "${key}", got ${typeof val}`)
    }
    return val
}

export function optionalDate(obj: Record<string, unknown>, key: string): Date | null {
    const val = obj[key]
    if (val === null || val === undefined) {
        return null
    }
    if (typeof val !== 'string' && !(val instanceof Date)) {
        throw new Error(`Expected date string or null for key "${key}", got ${typeof val}`)
    }
    const date = new Date(val as string)
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date value for key "${key}": ${val}`)
    }
    return date
}

export function optionalNumber(obj: Record<string, unknown>, key: string): number | null {
    const val = obj[key]
    if (val === null || val === undefined) {
        return null
    }
    if (typeof val !== 'number') {
        throw new Error(`Expected number or null for key "${key}", got ${typeof val}`)
    }
    return val
}
