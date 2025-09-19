/**
 * Data validation utilities for ensuring data integrity
 * Prevents NaN, Infinity, and other invalid values from entering the database
 */

/**
 * Check if a value is a valid finite number
 */
export function isValidNumber(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    !isNaN(value) &&
    isFinite(value)
  );
}

/**
 * Clean numeric value - replace NaN/Infinity with null
 */
export function cleanNumericValue(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value));

  if (!isValidNumber(num)) {
    return null;
  }

  return num;
}

/**
 * Validate and clean forecast data
 */
export interface ForecastData {
  powerMW: number | null;
  energyMWh?: number | null;
  capacityFactor?: number | null;
  confidence?: number | null;
  qualityScore?: number | null;
  temperature?: number | null;
  ghi?: number | null;
  dni?: number | null;
  windSpeed?: number | null;
  cloudCover?: number | null;
}

export function validateForecastData(data: Partial<ForecastData>): ForecastData {
  const cleaned: ForecastData = {
    powerMW: null
  };

  // Power MW - critical field, must be valid
  const powerMW = cleanNumericValue(data.powerMW);
  if (powerMW !== null) {
    // Ensure within reasonable bounds (0 to 10000 MW)
    cleaned.powerMW = Math.max(0, Math.min(10000, powerMW));
  }

  // Energy MWh - optional
  if ('energyMWh' in data) {
    const energyMWh = cleanNumericValue(data.energyMWh);
    if (energyMWh !== null) {
      cleaned.energyMWh = Math.max(0, Math.min(100000, energyMWh));
    }
  }

  // Capacity Factor - should be between 0 and 1
  if ('capacityFactor' in data) {
    const capacityFactor = cleanNumericValue(data.capacityFactor);
    if (capacityFactor !== null) {
      cleaned.capacityFactor = Math.max(0, Math.min(1, capacityFactor));
    }
  }

  // Confidence - should be between 0 and 1
  if ('confidence' in data) {
    const confidence = cleanNumericValue(data.confidence);
    if (confidence !== null) {
      cleaned.confidence = Math.max(0, Math.min(1, confidence));
    }
  }

  // Quality Score - should be between 0 and 1
  if ('qualityScore' in data) {
    const qualityScore = cleanNumericValue(data.qualityScore);
    if (qualityScore !== null) {
      cleaned.qualityScore = Math.max(0, Math.min(1, qualityScore));
    }
  }

  // Temperature - reasonable range -50 to 60 Celsius
  if ('temperature' in data) {
    const temperature = cleanNumericValue(data.temperature);
    if (temperature !== null) {
      cleaned.temperature = Math.max(-50, Math.min(60, temperature));
    }
  }

  // GHI - should be non-negative, max ~1500 W/m²
  if ('ghi' in data) {
    const ghi = cleanNumericValue(data.ghi);
    if (ghi !== null) {
      cleaned.ghi = Math.max(0, Math.min(1500, ghi));
    }
  }

  // DNI - should be non-negative, max ~1500 W/m²
  if ('dni' in data) {
    const dni = cleanNumericValue(data.dni);
    if (dni !== null) {
      cleaned.dni = Math.max(0, Math.min(1500, dni));
    }
  }

  // Wind Speed - reasonable range 0 to 50 m/s
  if ('windSpeed' in data) {
    const windSpeed = cleanNumericValue(data.windSpeed);
    if (windSpeed !== null) {
      cleaned.windSpeed = Math.max(0, Math.min(50, windSpeed));
    }
  }

  // Cloud Cover - 0 to 100 percent
  if ('cloudCover' in data) {
    const cloudCover = cleanNumericValue(data.cloudCover);
    if (cloudCover !== null) {
      cleaned.cloudCover = Math.max(0, Math.min(100, cloudCover));
    }
  }

  return cleaned;
}

/**
 * Validate weather data
 */
export interface WeatherData {
  temperature: number | null;
  humidity?: number | null;
  windSpeed?: number | null;
  cloudCover?: number | null;
  ghi?: number | null;
  dni?: number | null;
  dhi?: number | null;
}

export function validateWeatherData(data: Partial<WeatherData>): WeatherData {
  const cleaned: WeatherData = {
    temperature: null
  };

  // Temperature - reasonable range -50 to 60 Celsius
  const temperature = cleanNumericValue(data.temperature);
  if (temperature !== null) {
    cleaned.temperature = Math.max(-50, Math.min(60, temperature));
  }

  // Humidity - 0 to 100 percent
  if ('humidity' in data) {
    const humidity = cleanNumericValue(data.humidity);
    if (humidity !== null) {
      cleaned.humidity = Math.max(0, Math.min(100, humidity));
    }
  }

  // Wind Speed - reasonable range 0 to 50 m/s
  if ('windSpeed' in data) {
    const windSpeed = cleanNumericValue(data.windSpeed);
    if (windSpeed !== null) {
      cleaned.windSpeed = Math.max(0, Math.min(50, windSpeed));
    }
  }

  // Cloud Cover - 0 to 100 percent
  if ('cloudCover' in data) {
    const cloudCover = cleanNumericValue(data.cloudCover);
    if (cloudCover !== null) {
      cleaned.cloudCover = Math.max(0, Math.min(100, cloudCover));
    }
  }

  // Solar irradiance values
  if ('ghi' in data) {
    const ghi = cleanNumericValue(data.ghi);
    if (ghi !== null) {
      cleaned.ghi = Math.max(0, Math.min(1500, ghi));
    }
  }

  if ('dni' in data) {
    const dni = cleanNumericValue(data.dni);
    if (dni !== null) {
      cleaned.dni = Math.max(0, Math.min(1500, dni));
    }
  }

  if ('dhi' in data) {
    const dhi = cleanNumericValue(data.dhi);
    if (dhi !== null) {
      cleaned.dhi = Math.max(0, Math.min(1500, dhi));
    }
  }

  return cleaned;
}

/**
 * Batch validate array of records
 */
export function validateBatch<T>(
  records: T[],
  validator: (record: T) => T,
  onInvalid?: (record: T, index: number, error: Error) => void
): T[] {
  const validated: T[] = [];

  records.forEach((record, index) => {
    try {
      validated.push(validator(record));
    } catch (error) {
      if (onInvalid) {
        onInvalid(record, index, error as Error);
      }
      console.warn(`Skipping invalid record at index ${index}:`, error);
    }
  });

  return validated;
}

/**
 * Log validation statistics
 */
export function logValidationStats(
  originalCount: number,
  validatedCount: number,
  context: string
): void {
  const skipped = originalCount - validatedCount;
  if (skipped > 0) {
    console.warn(
      `[${context}] Data validation: ${validatedCount}/${originalCount} records valid (${skipped} skipped)`
    );
  }
}