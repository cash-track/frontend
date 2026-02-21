export const FILTER_CHARGE_TYPE_INCOME = 'income';
export const FILTER_CHARGE_TYPE_EXPENSE = 'expense';

export interface FilterDataInterface {
    dateFrom: string;
    dateTo: string;
    groupBy: string;
    tags: string;
    chargeType: string;
}

export function emptyFilterData(): FilterDataInterface {
    return {
        dateFrom: '',
        dateTo: '',
        groupBy: '',
        tags: '',
        chargeType: ''
    }
}

export interface FilterInterface extends FilterDataInterface {
    getQuery(params?: Record<string, number|string>): Record<string, number|string>;
}

export class Filter implements FilterInterface {
    private CHARGE_TYPES = [FILTER_CHARGE_TYPE_INCOME, FILTER_CHARGE_TYPE_EXPENSE];

    dateFrom = '';
    dateTo = '';
    groupBy = '';
    tags = '';
    chargeType = '';

    static createFromData(data?: FilterDataInterface, chargeType?: string): FilterInterface {
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

        if (data?.chargeType && filter.CHARGE_TYPES.includes(data?.chargeType)) {
            filter.chargeType = data.chargeType
        } else if (chargeType && filter.CHARGE_TYPES.includes(chargeType)) {
            filter.chargeType = chargeType
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

        if (this.chargeType) {
            query.set('charge-type', this.chargeType)
        }

        for (const key in params) {
            query.set(key, params[key])
        }

        return Object.fromEntries(query.entries())
    }
}
