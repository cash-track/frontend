import { requireNumber } from './_validators'

export class Pagination {
    readonly page: number
    readonly limit: number
    readonly total: number
    readonly totalPages: number
    readonly hasNext: boolean
    readonly hasPrev: boolean

    constructor(data: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }) {
        this.page = data.page
        this.limit = data.limit
        this.total = data.total
        this.totalPages = data.totalPages
        this.hasNext = data.hasNext
        this.hasPrev = data.hasPrev
    }

    static from(raw: unknown): Pagination {
        if (!raw || typeof raw !== 'object') {
            throw new Error('Pagination.from: expected object')
        }
        const d = raw as Record<string, unknown>
        return new Pagination({
            page: requireNumber(d, 'page'),
            limit: typeof d.perPage === 'number' ? d.perPage : requireNumber(d, 'limit'),
            total: typeof d.count === 'number' ? d.count : requireNumber(d, 'total'),
            totalPages: typeof d.pages === 'number' ? d.pages : requireNumber(d, 'totalPages'),
            hasNext: 'nextPage' in d
                ? d.nextPage !== null && d.nextPage !== undefined
                : d.hasNext === true,
            hasPrev: 'previousPage' in d
                ? d.previousPage !== null && d.previousPage !== undefined
                : d.hasPrev === true,
        })
    }
}

export interface PaginatedResponse<T> {
    data: T[]
    pagination: Pagination
}
