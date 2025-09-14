/**
 * Custom error classes for weather-related operations
 */

/**
 * Base weather error class
 */
export abstract class WeatherError extends Error {
  abstract readonly code: string;
  readonly timestamp: Date;

  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}

/**
 * Open-Meteo API related errors
 */
export class OpenMeteoApiError extends WeatherError {
  readonly code = 'OPENMETEO_API_ERROR';

  constructor(message: string, public readonly statusCode?: number, details?: any) {
    super(message, details);
  }
}

/**
 * Weather data validation errors
 */
export class WeatherDataValidationError extends WeatherError {
  readonly code = 'WEATHER_DATA_VALIDATION_ERROR';

  constructor(message: string, public readonly field?: string, details?: any) {
    super(message, { field, ...details });
  }
}

/**
 * Weather data transformation errors
 */
export class WeatherDataTransformationError extends WeatherError {
  readonly code = 'WEATHER_DATA_TRANSFORMATION_ERROR';

  constructor(message: string, public readonly sourceData?: any, details?: any) {
    super(message, { sourceData, ...details });
  }
}

/**
 * Weather sync operation errors
 */
export class WeatherSyncError extends WeatherError {
  readonly code = 'WEATHER_SYNC_ERROR';

  constructor(
    message: string,
    public readonly locationId?: string,
    public readonly operation?: string,
    details?: any
  ) {
    super(message, { locationId, operation, ...details });
  }
}

/**
 * Weather database operation errors
 */
export class WeatherDatabaseError extends WeatherError {
  readonly code = 'WEATHER_DATABASE_ERROR';

  constructor(
    message: string,
    public readonly operation?: string,
    public readonly query?: string,
    details?: any
  ) {
    super(message, { operation, query, ...details });
  }
}

/**
 * Weather location not found errors
 */
export class WeatherLocationNotFoundError extends WeatherError {
  readonly code = 'WEATHER_LOCATION_NOT_FOUND';

  constructor(public readonly locationId: string) {
    super(`Weather location not found: ${locationId}`, { locationId });
  }
}

/**
 * Weather data not found errors
 */
export class WeatherDataNotFoundError extends WeatherError {
  readonly code = 'WEATHER_DATA_NOT_FOUND';

  constructor(
    public readonly weatherId: string,
    public readonly locationId?: string,
    public readonly timeRange?: { start: Date; end: Date }
  ) {
    super(`Weather data not found: ${weatherId}`, {
      weatherId,
      locationId,
      timeRange: timeRange ? {
        start: timeRange.start.toISOString(),
        end: timeRange.end.toISOString()
      } : undefined
    });
  }
}

/**
 * Weather rate limiting errors
 */
export class WeatherRateLimitError extends WeatherError {
  readonly code = 'WEATHER_RATE_LIMIT_ERROR';

  constructor(
    message: string,
    public readonly retryAfter?: number,
    public readonly provider?: string
  ) {
    super(message, { retryAfter, provider });
  }
}

/**
 * Weather configuration errors
 */
export class WeatherConfigurationError extends WeatherError {
  readonly code = 'WEATHER_CONFIGURATION_ERROR';

  constructor(message: string, public readonly configKey?: string, details?: any) {
    super(message, { configKey, ...details });
  }
}

/**
 * Error factory for creating appropriate weather errors
 */
export class WeatherErrorFactory {
  /**
   * Create error from Open-Meteo API response
   */
  static fromOpenMeteoResponse(response: any, statusCode?: number): OpenMeteoApiError {
    if (response?.error && response?.reason) {
      return new OpenMeteoApiError(
        `Open-Meteo API error: ${response.reason}`,
        statusCode,
        response
      );
    }

    if (statusCode === 429) {
      return new WeatherRateLimitError(
        'Open-Meteo API rate limit exceeded',
        undefined,
        'open-meteo'
      );
    }

    return new OpenMeteoApiError(
      `Open-Meteo API request failed with status ${statusCode}`,
      statusCode,
      response
    );
  }

  /**
   * Create validation error for weather data
   */
  static createValidationError(message: string, field?: string, value?: any): WeatherDataValidationError {
    return new WeatherDataValidationError(message, field, { value });
  }

  /**
   * Create transformation error
   */
  static createTransformationError(message: string, sourceData?: any): WeatherDataTransformationError {
    return new WeatherDataTransformationError(message, sourceData);
  }

  /**
   * Create sync error
   */
  static createSyncError(
    message: string,
    locationId?: string,
    operation?: string,
    originalError?: Error
  ): WeatherSyncError {
    return new WeatherSyncError(message, locationId, operation, {
      originalError: originalError ? {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack
      } : undefined
    });
  }

  /**
   * Create database error
   */
  static createDatabaseError(
    message: string,
    operation?: string,
    originalError?: Error
  ): WeatherDatabaseError {
    return new WeatherDatabaseError(message, operation, undefined, {
      originalError: originalError ? {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack
      } : undefined
    });
  }
}

/**
 * Weather error utilities
 */
export class WeatherErrorUtils {
  /**
   * Check if error is retryable
   */
  static isRetryableError(error: Error): boolean {
    if (error instanceof OpenMeteoApiError) {
      // Retry on server errors (5xx) but not client errors (4xx)
      return !error.statusCode || error.statusCode >= 500;
    }

    if (error instanceof WeatherRateLimitError) {
      return true; // Rate limit errors are retryable after delay
    }

    if (error instanceof WeatherDatabaseError) {
      return true; // Database errors might be temporary
    }

    // Network errors are generally retryable
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return true;
    }

    return false;
  }

  /**
   * Get retry delay for error
   */
  static getRetryDelay(error: Error, attempt: number): number {
    if (error instanceof WeatherRateLimitError && error.retryAfter) {
      return error.retryAfter * 1000; // Convert to milliseconds
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, ...
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30 seconds
  }

  /**
   * Format error for logging
   */
  static formatForLogging(error: Error): any {
    if (error instanceof WeatherError) {
      return error.toJSON();
    }

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format error for API response
   */
  static formatForApiResponse(error: Error): {
    error: string;
    code?: string;
    details?: any;
  } {
    if (error instanceof WeatherError) {
      return {
        error: error.message,
        code: error.code,
        details: error.details
      };
    }

    return {
      error: error.message || 'An unexpected error occurred'
    };
  }
}

export {
  WeatherError,
  OpenMeteoApiError,
  WeatherDataValidationError,
  WeatherDataTransformationError,
  WeatherSyncError,
  WeatherDatabaseError,
  WeatherLocationNotFoundError,
  WeatherDataNotFoundError,
  WeatherRateLimitError,
  WeatherConfigurationError
};