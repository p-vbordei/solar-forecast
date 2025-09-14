/**
 * Request model for weather synchronization
 */
export interface SyncWeatherRequest {
  // Optional location filtering
  locationIds?: string[];     // Specific location GUIDs to sync

  // Time range for sync
  startDate?: Date;           // Start date for data sync
  endDate?: Date;             // End date for data sync

  // Sync options
  forceRefresh?: boolean;     // Force refresh even if data exists
  batchSize?: number;         // Records per batch (default: 1000)

  // Data options
  includeForecasts?: boolean; // Include forecast data
  forecastDays?: number;      // Number of forecast days (default: 7)

  // Quality options
  validateData?: boolean;     // Validate data before storing
  skipDuplicates?: boolean;   // Skip duplicate timestamps
}

/**
 * Response model for weather synchronization
 */
export interface SyncWeatherResponse {
  success: boolean;
  message: string;
  stats: {
    locationsProcessed: number;
    recordsInserted: number;
    recordsUpdated: number;
    recordsSkipped: number;
    batchesProcessed: number;
    processingTimeMs: number;
  };
  errors?: Array<{
    locationId: string;
    error: string;
    details?: string;
  }>;
}

/**
 * Validation for sync weather request
 */
export function validateSyncWeatherRequest(request: SyncWeatherRequest): string[] {
  const errors: string[] = [];

  if (request.batchSize && (request.batchSize < 1 || request.batchSize > 5000)) {
    errors.push('batchSize must be between 1 and 5000');
  }

  if (request.forecastDays && (request.forecastDays < 1 || request.forecastDays > 16)) {
    errors.push('forecastDays must be between 1 and 16');
  }

  if (request.startDate && request.endDate && request.startDate >= request.endDate) {
    errors.push('startDate must be before endDate');
  }

  if (request.locationIds && request.locationIds.length === 0) {
    errors.push('locationIds cannot be empty array');
  }

  return errors;
}