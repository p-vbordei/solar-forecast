import type { GenerateForecastRequest } from '../models/requests/GenerateForecastRequest';
import type { ListForecastsRequest } from '../models/requests/ListForecastsRequest';
import { FORECAST_CONSTRAINTS } from '../models/requests/GenerateForecastRequest';
import { LIST_FORECASTS_DEFAULTS } from '../models/requests/ListForecastsRequest';
import { BadRequestError } from '$lib/utils/ApiErrors';
import { ModelType, ResolutionType, ForecastType } from '@prisma/client';

/**
 * Validation utility for forecast service operations
 */
export class ForecastValidator {
  /**
   * Validate UUID format
   */
  private static validateUUID(value: string, fieldName: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new BadRequestError(`Invalid ${fieldName} format`, `${fieldName} must be a valid UUID`);
    }
  }

  /**
   * Validate ISO date string format
   */
  private static validateISODate(value: string, fieldName: string): void {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestError(`Invalid ${fieldName} format`, `${fieldName} must be a valid ISO date string`);
    }
  }

  /**
   * Validate enum value
   */
  private static validateEnum<T>(
    value: T,
    enumObject: Record<string, T>,
    fieldName: string
  ): void {
    const validValues = Object.values(enumObject);
    if (!validValues.includes(value)) {
      throw new BadRequestError(
        `Invalid ${fieldName}`,
        `${fieldName} must be one of: ${validValues.join(', ')}`
      );
    }
  }

  /**
   * Validate numeric range
   */
  private static validateRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): void {
    if (value < min || value > max) {
      throw new BadRequestError(
        `Invalid ${fieldName}`,
        `${fieldName} must be between ${min} and ${max}`
      );
    }
  }

  /**
   * Validate generate forecast request
   */
  static validateGenerateForecastRequest(request: GenerateForecastRequest): void {
    // Validate required fields
    if (!request.locationId) {
      throw new BadRequestError('Location ID is required', 'locationId is mandatory');
    }

    if (!request.horizonHours) {
      throw new BadRequestError('Horizon hours is required', 'horizonHours is mandatory');
    }

    if (!request.modelType) {
      throw new BadRequestError('Model type is required', 'modelType is mandatory');
    }

    if (!request.resolution) {
      throw new BadRequestError('Resolution is required', 'resolution is mandatory');
    }

    // Validate location ID format
    this.validateUUID(request.locationId, 'locationId');

    // Validate horizon hours
    this.validateRange(
      request.horizonHours,
      FORECAST_CONSTRAINTS.MIN_HORIZON_HOURS,
      FORECAST_CONSTRAINTS.MAX_HORIZON_HOURS,
      'horizonHours'
    );

    // Validate model type enum
    this.validateEnum(request.modelType, ModelType, 'modelType');

    // Validate resolution enum
    this.validateEnum(request.resolution, ResolutionType, 'resolution');

    // Validate optional start time
    if (request.startTime) {
      this.validateISODate(request.startTime, 'startTime');

      // Ensure start time is not in the past (allow 5 minutes buffer)
      const startTime = new Date(request.startTime);
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      if (startTime < fiveMinutesAgo) {
        throw new BadRequestError(
          'Start time cannot be in the past',
          'startTime must be current time or future'
        );
      }
    }

    // Validate description length
    if (request.description && request.description.length > FORECAST_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) {
      throw new BadRequestError(
        'Description too long',
        `Description must be ${FORECAST_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters or less`
      );
    }

    // Validate model parameters if provided
    if (request.modelParameters) {
      if (request.modelParameters.learningRate !== undefined) {
        this.validateRange(request.modelParameters.learningRate, 0.001, 1.0, 'modelParameters.learningRate');
      }

      if (request.modelParameters.features && request.modelParameters.features.length > 50) {
        throw new BadRequestError(
          'Too many features',
          'modelParameters.features cannot exceed 50 items'
        );
      }
    }
  }

  /**
   * Validate list forecasts request
   */
  static validateListForecastsRequest(request: ListForecastsRequest): void {
    // Validate location ID format if provided
    if (request.locationId) {
      this.validateUUID(request.locationId, 'locationId');
    }

    // Validate enum values if provided
    if (request.modelType) {
      this.validateEnum(request.modelType, ModelType, 'modelType');
    }

    if (request.forecastType) {
      this.validateEnum(request.forecastType, ForecastType, 'forecastType');
    }

    // Validate date range
    if (request.startDate) {
      this.validateISODate(request.startDate, 'startDate');
    }

    if (request.endDate) {
      this.validateISODate(request.endDate, 'endDate');
    }

    // Validate date range order
    if (request.startDate && request.endDate) {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);

      if (start >= end) {
        throw new BadRequestError(
          'Invalid date range',
          'startDate must be before endDate'
        );
      }

      // Validate reasonable date range (max 1 year)
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (end.getTime() - start.getTime() > oneYear) {
        throw new BadRequestError(
          'Date range too large',
          'Date range cannot exceed 1 year'
        );
      }
    }

    // Validate pagination
    if (request.limit !== undefined) {
      this.validateRange(request.limit, 1, LIST_FORECASTS_DEFAULTS.MAX_LIMIT, 'limit');
    }

    if (request.offset !== undefined) {
      if (request.offset < 0) {
        throw new BadRequestError('Invalid offset', 'offset must be non-negative');
      }
    }

    // Validate sort parameters
    if (request.sortBy) {
      const validSortFields = ['createdAt', 'timestamp', 'accuracy', 'confidence'];
      if (!validSortFields.includes(request.sortBy)) {
        throw new BadRequestError(
          'Invalid sort field',
          `sortBy must be one of: ${validSortFields.join(', ')}`
        );
      }
    }

    if (request.sortOrder) {
      const validSortOrders = ['asc', 'desc'];
      if (!validSortOrders.includes(request.sortOrder)) {
        throw new BadRequestError(
          'Invalid sort order',
          `sortOrder must be one of: ${validSortOrders.join(', ')}`
        );
      }
    }

    // Validate search query length
    if (request.search && request.search.length > 255) {
      throw new BadRequestError(
        'Search query too long',
        'search must be 255 characters or less'
      );
    }
  }

  /**
   * Validate forecast ID format
   */
  static validateForecastId(id: string): void {
    if (!id) {
      throw new BadRequestError('Forecast ID is required', 'id parameter is mandatory');
    }

    this.validateUUID(id, 'id');
  }

  /**
   * Sanitize and normalize request parameters
   */
  static normalizeListForecastsRequest(request: ListForecastsRequest): ListForecastsRequest {
    return {
      ...request,
      // Apply defaults
      limit: request.limit ?? LIST_FORECASTS_DEFAULTS.LIMIT,
      offset: request.offset ?? 0,
      sortBy: request.sortBy ?? LIST_FORECASTS_DEFAULTS.SORT_BY,
      sortOrder: request.sortOrder ?? LIST_FORECASTS_DEFAULTS.SORT_ORDER,
      activeOnly: request.activeOnly ?? LIST_FORECASTS_DEFAULTS.ACTIVE_ONLY,
      includeData: request.includeData ?? false,
      includeAccuracy: request.includeAccuracy ?? false,
      // Trim and sanitize text fields
      search: request.search?.trim() || undefined
    };
  }

  /**
   * Validate forecast horizon is reasonable for the location
   */
  static validateHorizonForLocation(horizonHours: number, locationCapacityMW: number): void {
    // Longer horizons are less accurate for smaller installations
    if (locationCapacityMW < 10 && horizonHours > 48) {
      console.warn(
        `Long forecast horizon (${horizonHours}h) for small installation (${locationCapacityMW}MW) may have lower accuracy`
      );
    }

    // Very long horizons should be warned about
    if (horizonHours > 72) {
      console.warn(
        `Very long forecast horizon (${horizonHours}h) may have significantly reduced accuracy`
      );
    }
  }
}