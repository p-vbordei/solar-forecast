/**
 * Request model for fetching weather data
 */
export interface FetchWeatherRequest {
  // Required location
  locationId: string;         // GUID of the location

  // Time range
  startDate?: Date;           // Start date for historical data
  endDate?: Date;             // End date for historical data
  days?: number;              // Number of days for forecast (default: 7)

  // Data resolution
  resolution?: 'hourly' | '15min';  // Data resolution (default: hourly)

  // Data filtering
  includeForecasts?: boolean; // Include forecast data
  includeHistorical?: boolean;// Include historical data
  includeSolarData?: boolean; // Include solar radiation data

  // Aggregation options
  aggregate?: {
    interval: '1hour' | '3hour' | '6hour' | '1day';
    metrics: Array<'avg' | 'max' | 'min'>;
  };

  // Pagination
  limit?: number;             // Max records to return (default: 100)
  offset?: number;            // Offset for pagination
}

/**
 * Response model for fetching weather data
 */
export interface FetchWeatherResponse {
  success: boolean;
  data: Array<{
    id: string;
    locationId: string;
    timestamp: Date;
    temperature: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    cloudCover: number;
    ghi?: number;
    dni?: number;
    dhi?: number;
    source: string;
    dataQuality: string;
  }>;
  pagination?: {
    total: number;
    size: number;
    current: number;
  };
  metadata: {
    locationName?: string;
    locationCoordinates?: {
      latitude: number;
      longitude: number;
    };
    dataSource: string;
    generatedAt: Date;
  };
}

/**
 * Validation for fetch weather request
 */
export function validateFetchWeatherRequest(request: FetchWeatherRequest): string[] {
  const errors: string[] = [];

  // Validate location ID format (GUID)
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!guidRegex.test(request.locationId)) {
    errors.push('locationId must be a valid GUID');
  }

  // Validate date range
  if (request.startDate && request.endDate && request.startDate >= request.endDate) {
    errors.push('startDate must be before endDate');
  }

  // Validate days for forecast
  if (request.days && (request.days < 1 || request.days > 16)) {
    errors.push('days must be between 1 and 16');
  }

  // Validate pagination
  if (request.limit && (request.limit < 1 || request.limit > 1000)) {
    errors.push('limit must be between 1 and 1000');
  }

  if (request.offset && request.offset < 0) {
    errors.push('offset must be non-negative');
  }

  // Validate aggregation interval
  if (request.aggregate && !['1hour', '3hour', '6hour', '1day'].includes(request.aggregate.interval)) {
    errors.push('aggregate.interval must be one of: 1hour, 3hour, 6hour, 1day');
  }

  return errors;
}