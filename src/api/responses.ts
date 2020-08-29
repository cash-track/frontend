

export interface EntityIDResponseInterface {
    type: string;
    id: string|number;
}

export interface ValidationResponseInterface {
    errors: Record<string, string>;
}

export interface ErrorResponseInterface {
    error?: string;
    message: string;
}


