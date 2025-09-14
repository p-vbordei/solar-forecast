import type { ModelType, ForecastType } from '@prisma/client';

/**
 * Request interface for listing and filtering forecasts
 */
export interface ListForecastsRequest {
  /** Filter by location ID */
  locationId?: string;

  /** Filter by model type */
  modelType?: ModelType;

  /** Filter by forecast type */
  forecastType?: ForecastType;

  /** Filter forecasts after this date (ISO string) */
  startDate?: string;

  /** Filter forecasts before this date (ISO string) */
  endDate?: string;

  /** Search in forecast descriptions */
  search?: string;

  /** Pagination: number of records to return */
  limit?: number;

  /** Pagination: number of records to skip */
  offset?: number;

  /** Sort field */
  sortBy?: 'createdAt' | 'timestamp' | 'accuracy' | 'confidence';

  /** Sort direction */
  sortOrder?: 'asc' | 'desc';

  /** Include forecast data points in response */
  includeData?: boolean;

  /** Include accuracy metrics in response */
  includeAccuracy?: boolean;

  /** Only show active (non-deleted) forecasts */
  activeOnly?: boolean;
}

/**
 * Default values for list forecasts request
 */
export const LIST_FORECASTS_DEFAULTS = {
  /** Default page size */
  LIMIT: 50,
  /** Maximum page size */
  MAX_LIMIT: 100,
  /** Default sort field */
  SORT_BY: 'createdAt' as const,
  /** Default sort order */
  SORT_ORDER: 'desc' as const,
  /** Default to active forecasts only */
  ACTIVE_ONLY: true
} as const;