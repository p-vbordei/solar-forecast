/**
 * Open-Meteo API Client for weather and solar radiation data
 */
export interface OpenMeteoClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export interface WeatherParameters {
  // Basic weather parameters
  temperature_2m?: boolean;
  relative_humidity_2m?: boolean;
  pressure_msl?: boolean;
  cloud_cover?: boolean;
  wind_speed_10m?: boolean;
  wind_direction_10m?: boolean;
  precipitation?: boolean;

  // Solar radiation parameters
  shortwave_radiation?: boolean;
  direct_normal_irradiance?: boolean;
  diffuse_radiation?: boolean;
  terrestrial_radiation?: boolean;
}

export interface ForecastRequest {
  latitude: number;
  longitude: number;
  hourly?: string[];
  timezone?: string;
  start_date?: string;
  end_date?: string;
  forecast_days?: number;
}

export class OpenMeteoClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retryAttempts: number;
  private readonly retryDelayMs: number;

  constructor(options: OpenMeteoClientOptions = {}) {
    this.baseUrl = options.baseUrl || 'https://api.open-meteo.com/v1';
    this.timeoutMs = options.timeoutMs || 30000; // 30 seconds
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelayMs = options.retryDelayMs || 1000; // 1 second
  }

  /**
   * Get current weather and forecast data
   */
  async getForecast(request: ForecastRequest): Promise<any> {
    const url = this.buildForecastUrl(request);

    return this.makeRequest(url);
  }

  /**
   * Get current weather for a location
   */
  async getCurrentWeather(latitude: number, longitude: number): Promise<any> {
    const hourlyParams = this.getDefaultHourlyParams();

    const request: ForecastRequest = {
      latitude,
      longitude,
      hourly: hourlyParams,
      forecast_days: 1,
      timezone: 'UTC'
    };

    return this.getForecast(request);
  }

  /**
   * Get weather forecast for multiple days
   */
  async getWeatherForecast(
    latitude: number,
    longitude: number,
    days: number = 7
  ): Promise<any> {
    const hourlyParams = this.getDefaultHourlyParams();

    const request: ForecastRequest = {
      latitude,
      longitude,
      hourly: hourlyParams,
      forecast_days: Math.min(days, 16), // Open-Meteo limit
      timezone: 'UTC'
    };

    return this.getForecast(request);
  }

  /**
   * Get historical weather data
   */
  async getHistoricalWeather(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string
  ): Promise<any> {
    const hourlyParams = this.getDefaultHourlyParams();

    const request: ForecastRequest = {
      latitude,
      longitude,
      hourly: hourlyParams,
      start_date: startDate,
      end_date: endDate,
      timezone: 'UTC'
    };

    return this.getForecast(request);
  }

  /**
   * Build forecast URL with parameters
   */
  private buildForecastUrl(request: ForecastRequest): string {
    const params = new URLSearchParams();

    params.set('latitude', request.latitude.toString());
    params.set('longitude', request.longitude.toString());

    if (request.hourly && request.hourly.length > 0) {
      params.set('hourly', request.hourly.join(','));
    }

    if (request.timezone) {
      params.set('timezone', request.timezone);
    }

    if (request.start_date) {
      params.set('start_date', request.start_date);
    }

    if (request.end_date) {
      params.set('end_date', request.end_date);
    }

    if (request.forecast_days) {
      params.set('forecast_days', request.forecast_days.toString());
    }

    return `${this.baseUrl}/forecast?${params.toString()}`;
  }

  /**
   * Get default hourly parameters for weather and solar data
   */
  private getDefaultHourlyParams(): string[] {
    return [
      // Basic weather
      'temperature_2m',
      'relative_humidity_2m',
      'pressure_msl',
      'cloud_cover',
      'wind_speed_10m',
      'wind_direction_10m',
      'precipitation',

      // Solar radiation
      'shortwave_radiation',
      'direct_normal_irradiance',
      'diffuse_radiation',
      'terrestrial_radiation'
    ];
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(url: string): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SolarForecastPlatform/1.0'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Validate response structure
        this.validateResponse(data);

        return data;

      } catch (error) {
        lastError = error as Error;

        if (attempt < this.retryAttempts) {
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(`Open-Meteo request failed (attempt ${attempt}): ${error.message}. Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }

    throw new Error(`Open-Meteo API request failed after ${this.retryAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * Validate Open-Meteo API response
   */
  private validateResponse(data: any): void {
    if (!data) {
      throw new Error('Empty response from Open-Meteo API');
    }

    if (data.error) {
      throw new Error(`Open-Meteo API error: ${data.reason || data.error}`);
    }

    if (!data.hourly || !data.hourly.time) {
      throw new Error('Invalid response: missing hourly time data');
    }

    // Check for basic required fields
    const requiredFields = ['temperature_2m', 'relative_humidity_2m', 'pressure_msl'];
    for (const field of requiredFields) {
      if (!data.hourly[field]) {
        console.warn(`Missing required field in Open-Meteo response: ${field}`);
      }
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build parameters object for weather data
   */
  static buildWeatherParameters(includeSolar: boolean = true): WeatherParameters {
    return {
      // Basic weather
      temperature_2m: true,
      relative_humidity_2m: true,
      pressure_msl: true,
      cloud_cover: true,
      wind_speed_10m: true,
      wind_direction_10m: true,
      precipitation: true,

      // Solar radiation (optional)
      ...(includeSolar && {
        shortwave_radiation: true,
        direct_normal_irradiance: true,
        diffuse_radiation: true,
        terrestrial_radiation: true
      })
    };
  }

  /**
   * Format date for Open-Meteo API (YYYY-MM-DD)
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get timezone for coordinates (simplified)
   */
  static getTimezoneForCoordinates(latitude: number, longitude: number): string {
    // Simplified timezone detection - in production, use a proper timezone library
    if (longitude >= -7.5 && longitude < 7.5) return 'UTC';
    if (longitude >= 7.5 && longitude < 22.5) return 'Europe/Berlin';
    if (longitude >= 22.5 && longitude < 37.5) return 'Europe/Bucharest';
    if (longitude >= -97.5 && longitude < -82.5) return 'America/Chicago';
    if (longitude >= -82.5 && longitude < -67.5) return 'America/New_York';
    return 'auto'; // Let Open-Meteo handle it
  }
}