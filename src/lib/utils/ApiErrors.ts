/**
 * Base API error class
 */
export abstract class ApiError extends Error {
    abstract readonly statusCode: number;
    abstract readonly code: string;
    readonly field?: string;
    readonly details?: string;

    constructor(message: string, field?: string, details?: string) {
        super(message);
        this.name = this.constructor.name;
        this.field = field;
        this.details = details;
        
        // Ensures proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Bad Request Error (400)
 */
export class BadRequestError extends ApiError {
    readonly statusCode = 400;
    readonly code = 'BAD_REQUEST';

    constructor(message: string, field?: string, details?: string) {
        super(message, field, details);
    }
}

/**
 * Validation Error (422)
 */
export class ValidationError extends ApiError {
    readonly statusCode = 422;
    readonly code = 'VALIDATION_ERROR';

    constructor(message: string, field?: string, details?: string) {
        super(message, field, details);
    }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends ApiError {
    readonly statusCode = 404;
    readonly code = 'NOT_FOUND';

    constructor(message = 'Resource not found', details?: string) {
        super(message, undefined, details);
    }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends ApiError {
    readonly statusCode = 409;
    readonly code = 'CONFLICT';

    constructor(message: string, details?: string) {
        super(message, undefined, details);
    }
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends ApiError {
    readonly statusCode = 401;
    readonly code = 'UNAUTHORIZED';

    constructor(message = 'Unauthorized access', details?: string) {
        super(message, undefined, details);
    }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends ApiError {
    readonly statusCode = 403;
    readonly code = 'FORBIDDEN';

    constructor(message = 'Access forbidden', details?: string) {
        super(message, undefined, details);
    }
}

/**
 * Internal Server Error (500)
 */
export class InternalServerError extends ApiError {
    readonly statusCode = 500;
    readonly code = 'INTERNAL_ERROR';

    constructor(message = 'Internal server error', details?: string) {
        super(message, undefined, details);
    }
}

/**
 * Business Logic Errors - Domain-specific errors
 */

/**
 * Location-specific validation error
 */
export class LocationValidationError extends ValidationError {
    constructor(message: string, field?: string) {
        super(message, field, 'Location validation failed');
    }
}

/**
 * Coordinates validation error
 */
export class CoordinatesValidationError extends ValidationError {
    constructor(message: string) {
        super(message, 'coordinates', 'Invalid geographic coordinates');
    }
}

/**
 * Location not found error
 */
export class LocationNotFoundError extends NotFoundError {
    constructor(locationId?: string | number) {
        const message = locationId 
            ? `Location with ID ${locationId} not found` 
            : 'Location not found';
        super(message, 'Location does not exist in the system');
    }
}

/**
 * Location already exists error
 */
export class LocationExistsError extends ConflictError {
    constructor(name: string) {
        super(`A location with name '${name}' already exists`, 'Location names must be unique');
    }
}