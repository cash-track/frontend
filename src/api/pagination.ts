export interface PaginatedResponseInterface {
    pagination: PaginationInterface;
}

export interface PaginationInterface {
    count: number;
    countDisplayed: number;
    page: number;
    pages: number;
    perPage: number;
    nextPage: number|null;
    previousPage: number|null;
}

export function emptyPagination(): PaginationInterface {
    return {
        count: 0,
        countDisplayed: 0,
        page: 0,
        pages: 0,
        perPage: 0,
        nextPage: null,
        previousPage: null,
    }
}
