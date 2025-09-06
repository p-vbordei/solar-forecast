import { ApiError } from './ApiErrors';
import { ApiResponse } from './ApiResponse';

/**
 * Global error handler for API controllers
 */
export class ErrorHandler {
    /**
     * Handle any error and return appropriate API response
     */
    static handle(error: unknown): Response {
        console.error('API Error:', error);

        // Handle known API errors
        if (error instanceof ApiError) {
            return ApiResponse.error(
                error.message,
                error.statusCode,
                error.details,
                error.field,
                error.code
            );
        }

        // Handle standard JavaScript errors
        if (error instanceof Error) {
            // Check for specific error patterns
            if (error.message.includes('already exists')) {
                return ApiResponse.conflict(error.message, error.message);
            }
            
            if (error.message.includes('not found')) {
                return ApiResponse.notFound(error.message, error.message);
            }
            
            if (error.message.includes('invalid') || error.message.includes('required')) {
                return ApiResponse.validationError(error.message, undefined, error.message);
            }
            
            if (error.message.includes('unauthorized') || error.message.includes('permission')) {
                return ApiResponse.unauthorized(error.message, error.message);
            }

            // Generic error with details
            return ApiResponse.internalError('Internal server error', error.message);
        }

        // Handle unknown errors
        return ApiResponse.internalError(
            'An unexpected error occurred',
            'Unknown error type'
        );
    }

    /**
     * Async wrapper for controller methods that handles errors automatically
     */
    static async withErrorHandling<T>(
        operation: () => Promise<T>
    ): Promise<T | Response> {
        try {
            return await operation();
        } catch (error) {
            return ErrorHandler.handle(error);
        }
    }

    /**
     * Sync wrapper for controller methods that handles errors automatically
     */
    static withSyncErrorHandling<T>(
        operation: () => T
    ): T | Response {
        try {
            return operation();
        } catch (error) {
            return ErrorHandler.handle(error);
        }
    }
}

/**
 * Method wrapper for automatic error handling in controller methods
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<Response>>(
    method: T
): T {
    return (async (...args: any[]) => {
        try {
            return await method(...args);
        } catch (error) {
            return ErrorHandler.handle(error);
        }
    }) as T;
}