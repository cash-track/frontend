
export interface FilterDataInterface {
    dateFrom: string;
    dateTo: string;
}

export interface FilterInterface extends FilterDataInterface {
    getQuery(params?: Record<string, number|string>): Record<string, number|string>;
}

export class Filter implements FilterInterface {
    dateFrom = '';
    dateTo = '';

    static createFromData(data?: FilterDataInterface): FilterInterface {
        const filter = new Filter()

        if (data?.dateFrom) {
            filter.dateFrom = data.dateFrom
        }

        if (data?.dateTo) {
            filter.dateTo = data.dateTo
        }

        return filter
    }

    getQuery(params?: Record<string, number|string>): Record<string, number|string> {
        const query: Map<string, string> = new Map<string, string>()

        if (this.dateFrom) {
            query.set('date-from', this.dateFrom)
        }

        if (this.dateTo) {
            query.set('date-to', this.dateTo)
        }

        return Object.fromEntries(Object.assign(query, params))
    }
}
