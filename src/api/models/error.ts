export class ApiError {
    readonly message: string
    readonly error: string | null

    constructor(message: string, error: string | null = null) {
        this.message = message
        this.error = error
    }

    static from(raw: unknown): ApiError {
        if (!raw || typeof raw !== 'object') {
            throw new Error('ApiError.from: expected object')
        }
        const d = raw as Record<string, unknown>
        const message = typeof d.message === 'string' ? d.message : 'Unknown error'
        const error = typeof d.error === 'string' ? d.error : null
        return new ApiError(message, error)
    }
}

export class ValidationError {
    readonly errors: Record<string, string[]>

    constructor(errors: Record<string, string[]>) {
        this.errors = errors
    }

    static from(raw: unknown): ValidationError {
        if (!raw || typeof raw !== 'object') {
            throw new Error('ValidationError.from: expected object')
        }
        const d = raw as Record<string, unknown>
        if (!d.errors || typeof d.errors !== 'object') {
            throw new Error('ValidationError.from: missing errors field')
        }
        const errors: Record<string, string[]> = {}
        for (const [key, value] of Object.entries(d.errors as Record<string, unknown>)) {
            if (Array.isArray(value)) {
                errors[key] = value.filter((v): v is string => typeof v === 'string')
            } else if (typeof value === 'string') {
                errors[key] = [value]
            }
        }
        return new ValidationError(errors)
    }

    getFieldError(field: string): string | null {
        return this.errors[field]?.[0] ?? null
    }
}
