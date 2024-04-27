
export interface FilterDataInterface {
    dateFrom: string;
    dateTo: string;
    groupBy: string;
    tags: string;
}

export function emptyFilterData(): FilterDataInterface {
    return {
        dateFrom: '',
        dateTo: '',
        groupBy: '',
        tags: '',
    }
}

export interface FilterInterface extends FilterDataInterface {
    getQuery(params?: Record<string, number|string>): Record<string, number|string>;
}

export class Filter implements FilterInterface {
    dateFrom = '';
    dateTo = '';
    groupBy = '';
    tags = '';

    static createFromData(data?: FilterDataInterface): FilterInterface {
        const filter = new Filter()

        if (data?.dateFrom) {
            filter.dateFrom = data.dateFrom
        }

        if (data?.dateTo) {
            filter.dateTo = data.dateTo
        }

        if (data?.groupBy) {
            filter.groupBy = data.groupBy
        }

        if (data?.tags) {
            filter.tags = data.tags
        }

        return filter
    }

    getQuery(params?: Record<string, number|string>): Record<string, number|string> {
        const query: Map<string, number|string> = new Map<string, number|string>()

        if (this.dateFrom) {
            query.set('date-from', this.dateFrom)
        }

        if (this.dateTo) {
            query.set('date-to', this.dateTo)
        }

        if (this.groupBy) {
            query.set('group-by', this.groupBy)
        }

        if (this.tags) {
            query.set('tags', this.tags)
        }

        for (const key in params) {
            query.set(key, params[key])
        }

        return Object.fromEntries(query.entries())
    }
}
