
export interface FilterDataInterface {
    dateFrom: string;
    dateTo: string;
    groupBy: string;
}

export function emptyFilterData(): FilterDataInterface {
    return {
        dateFrom: '',
        dateTo: '',
        groupBy: '',
    }
}

export interface FilterInterface extends FilterDataInterface {
    getQuery(params?: Record<string, number|string>): Record<string, number|string>;
}

export class Filter implements FilterInterface {
    dateFrom = '';
    dateTo = '';
    groupBy = '';

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

        for (const key in params) {
            query.set(key, params[key])
        }

        return Object.fromEntries(query.entries())
    }
}
