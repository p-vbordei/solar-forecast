import { json } from '@sveltejs/kit';

/**
 * Standardized API response structure
 */
export interface ApiResponseData<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    details?: string;
    field?: string;
    code?: string;
    pagination?: {
        total: number;
        size: number;
        current: number;
    };
    filters?: Record<string, any>;
}

/**
 * Utility class for creating standardized API responses
 */
export class ApiResponse {
    /**
     * Create a success response
     */
    static success<T>(data?: T, message?: string, status = 200): Response {
        const responseData: ApiResponseData<T> = {
            success: true,
            data,
            ...(message && { message })
        };

        return json(responseData, { status });
    }

    /**
     * Create a success response with pagination
     */
    static successWithPagination<T>(
        data: T[],
        pagination: { total: number; size: number; current: number },
        filters?: Record<string, any>,
        message?: string
    ): Response {
        const responseData: ApiResponseData<T[]> = {
            success: true,
            data,
            pagination,
            ...(filters && { filters }),
            ...(message && { message })
        };

        return json(responseData, { status: 200 });
    }

    /**
     * Create a created response (201)
     */
    static created<T>(data: T, message = 'Resource created successfully'): Response {
        return ApiResponse.success(data, message, 201);
    }

    /**
     * Create an error response
     */
    static error(
        error: string,
        status = 500,
        details?: string,
        field?: string,
        code?: string
    ): Response {
        const responseData: ApiResponseData = {
            success: false,
            error,
            ...(details && { details }),
            ...(field && { field }),
            ...(code && { code })
        };

        return json(responseData, { status });
    }

    /**
     * Create a bad request response (400)
     */
    static badRequest(error: string, details?: string, field?: string): Response {
        return ApiResponse.error(error, 400, details, field);
    }

    /**
     * Create a not found response (404)
     */
    static notFound(error = 'Resource not found', details?: string): Response {
        return ApiResponse.error(error, 404, details);
    }

    /**
     * Create a conflict response (409)
     */
    static conflict(error: string, details?: string, code?: string): Response {
        return ApiResponse.error(error, 409, details, undefined, code);
    }

    /**
     * Create an unauthorized response (401)
     */
    static unauthorized(error = 'Unauthorized access', details?: string): Response {
        return ApiResponse.error(error, 401, details);
    }

    /**
     * Create a forbidden response (403)
     */
    static forbidden(error = 'Access forbidden', details?: string): Response {
        return ApiResponse.error(error, 403, details);
    }

    /**
     * Create a validation error response (422)
     */
    static validationError(error: string, field?: string, details?: string): Response {
        return ApiResponse.error(error, 422, details, field, 'VALIDATION_ERROR');
    }

    /**
     * Create an internal server error response (500)
     */
    static internalError(error = 'Internal server error', details?: string): Response {
        return ApiResponse.error(error, 500, details, undefined, 'INTERNAL_ERROR');
    }
}