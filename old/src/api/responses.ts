

export interface EntityIDResponseInterface {
    type: string;
    id: string|number;
}

export interface ValidationResponseInterface {
    errors: Record<string, string>;
}

export interface ErrorResponseInterface extends MessageResponseInterface {
    error?: string;
    message: string;
}

export interface MessageResponseInterface {
    message: string;
}
