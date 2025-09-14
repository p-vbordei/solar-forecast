import { WeatherRepository } from '../repositories/WeatherRepository';
import { LocationsRepository } from '../../locations/repositories/LocationsRepository';
import { OpenMeteoClient } from '../../../integrations/open-meteo/OpenMeteoClient';
import { WeatherDataTransformer } from '../helpers/WeatherDataTransformer';
import type { WeatherData, WeatherForecast } from '../models/dto/weather';
import type { SyncWeatherRequest, SyncWeatherResponse } from '../models/requests/SyncWeatherRequest';

/**
 * Service layer for weather data operations
 * Contains business logic and coordinates between repository and integrations
 */
export class WeatherService {
  private weatherRepository = new WeatherRepository();
  private locationsRepository = new LocationsRepository();
  private openMeteoClient = new OpenMeteoClient();

  /**
   * Get current weather data for a location
   */
  async getCurrentWeather(locationId: string): Promise<WeatherData[]> {
    // Validate GUID format
    this.validateGuidFormat(locationId);

    // Get location coordinates
    const location = await this.locationsRepository.findById(locationId);
    if (!location) {
      throw new Error(`Location not found: ${locationId}`);
    }

    try {
      // Fetch current weather from Open-Meteo
      const weatherResponse = await this.openMeteoClient.getCurrentWeather(
        location.latitude,
        location.longitude
      );

      // Transform API response to WeatherData format
      const weatherData = WeatherDataTransformer.transform(weatherResponse, locationId);

      // Store in database
      if (weatherData.length > 0) {
        await this.weatherRepository.bulkInsert(weatherData, {
          upsert: true,
          validateData: true
        });
      }

      return weatherData;

    } catch (error) {
      console.error(`Failed to fetch current weather for location ${locationId}:`, error);

      // Try to return cached data as fallback
      const cachedData = await this.weatherRepository.getLatest(locationId);
      if (cachedData) {
        console.warn(`Using cached weather data for location ${locationId}`);
        return [cachedData];
      }

      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  }

  /**
   * Get weather forecast for a location
   */
  async getForecast(locationId: string, days: number = 7): Promise<WeatherForecast> {
    // Validate parameters
    this.validateGuidFormat(locationId);

    if (days < 1 || days > 16) {
      throw new Error('days must be between 1 and 16');
    }

    // Get location coordinates
    const location = await this.locationsRepository.findById(locationId);
    if (!location) {
      throw new Error(`Location not found: ${locationId}`);
    }

    try {
      // Fetch forecast from Open-Meteo
      const forecastResponse = await this.openMeteoClient.getWeatherForecast(
        location.latitude,
        location.longitude,
        days
      );

      // Transform API response to WeatherData format
      const forecastData = WeatherDataTransformer.transform(forecastResponse, locationId);

      // Store forecast in database - overwrite existing forecasts for same timestamps
      if (forecastData.length > 0) {
        await this.weatherRepository.bulkInsert(forecastData, {
          overwriteForecasts: true,
          validateData: true
        });
      }

      const now = new Date();
      const validUntil = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

      return {
        locationId,
        forecastData,
        generatedAt: now,
        validUntil,
        source: 'open-meteo'
      };

    } catch (error) {
      console.error(`Failed to fetch forecast for location ${locationId}:`, error);
      throw new Error(`Failed to fetch weather forecast: ${error.message}`);
    }
  }

  /**
   * Synchronize weather data for all locations or specified locations
   */
  async syncAllLocations(request: SyncWeatherRequest): Promise<SyncWeatherResponse> {
    const startTime = Date.now();
    const stats = {
      locationsProcessed: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      batchesProcessed: 0,
      processingTimeMs: 0
    };
    const errors: Array<{ locationId: string; error: string; details?: string }> = [];

    try {
      // Get locations to sync
      let locations;
      if (request.locationIds && request.locationIds.length > 0) {
        // Sync specific locations
        locations = await Promise.all(
          request.locationIds.map(id => this.locationsRepository.findById(id))
        );
        locations = locations.filter(Boolean); // Remove nulls
      } else {
        // Sync all active locations
        const result = await this.locationsRepository.findAll(
          { status: 'ACTIVE' }, // Only active locations
          0, // offset
          1000, // limit - adjust as needed
          { createdAt: 'asc' },
          { id: true, latitude: true, longitude: true }
        );
        locations = result.locations;
      }

      console.log(`Starting weather sync for ${locations.length} locations`);

      // Process locations in batches
      const batchSize = request.batchSize || 10; // Locations per batch, not records
      for (let i = 0; i < locations.length; i += batchSize) {
        const locationBatch = locations.slice(i, i + batchSize);

        // Process batch in parallel
        const batchPromises = locationBatch.map(async (location) => {
          try {
            stats.locationsProcessed++;

            // Determine what data to fetch
            let weatherData: WeatherData[] = [];

            if (request.includeForecasts !== false) {
              // Fetch forecast data
              const forecastDays = request.forecastDays || 7;
              const forecastResponse = await this.openMeteoClient.getWeatherForecast(
                location.latitude,
                location.longitude,
                forecastDays
              );
              const forecastData = WeatherDataTransformer.transform(forecastResponse, location.id);
              weatherData.push(...forecastData);
            } else {
              // Fetch only current weather
              const currentResponse = await this.openMeteoClient.getCurrentWeather(
                location.latitude,
                location.longitude
              );
              const currentData = WeatherDataTransformer.transform(currentResponse, location.id);
              weatherData.push(...currentData);
            }

            // Store in database if we have data
            if (weatherData.length > 0) {
              const insertResult = await this.weatherRepository.bulkInsert(weatherData, {
                overwriteForecasts: request.includeForecasts !== false, // Overwrite when including forecasts
                validateData: request.validateData !== false
              });

              stats.recordsInserted += insertResult.inserted;
              stats.recordsUpdated += insertResult.updated;
              stats.recordsSkipped += insertResult.skipped;
              stats.batchesProcessed += insertResult.batches;
            }

            return { locationId: location.id, success: true };

          } catch (error) {
            console.error(`Error syncing weather for location ${location.id}:`, error);
            errors.push({
              locationId: location.id,
              error: error.message,
              details: error.stack
            });
            return { locationId: location.id, success: false, error };
          }
        });

        // Wait for batch to complete
        await Promise.allSettled(batchPromises);

        // Add small delay between batches to avoid overwhelming API
        if (i + batchSize < locations.length) {
          await this.delay(100); // 100ms delay
        }
      }

      stats.processingTimeMs = Date.now() - startTime;

      const response: SyncWeatherResponse = {
        success: errors.length === 0,
        message: errors.length === 0
          ? `Successfully synced weather data for ${stats.locationsProcessed} locations`
          : `Synced ${stats.locationsProcessed - errors.length}/${stats.locationsProcessed} locations with ${errors.length} errors`,
        stats,
        ...(errors.length > 0 && { errors })
      };

      console.log('Weather sync completed:', response);
      return response;

    } catch (error) {
      stats.processingTimeMs = Date.now() - startTime;

      console.error('Weather sync failed:', error);
      return {
        success: false,
        message: `Weather sync failed: ${error.message}`,
        stats,
        errors: [{
          locationId: 'system',
          error: error.message,
          details: error.stack
        }]
      };
    }
  }

  /**
   * Get weather record by ID
   */
  async getWeatherById(id: string): Promise<WeatherData> {
    this.validateGuidFormat(id);

    const weatherRecord = await this.weatherRepository.findById(id);
    if (!weatherRecord) {
      throw new Error(`Weather record not found: ${id}`);
    }

    return weatherRecord;
  }

  /**
   * Get historical weather data for a location
   */
  async getHistoricalWeather(
    locationId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 1000
  ): Promise<WeatherData[]> {
    this.validateGuidFormat(locationId);

    // Validate date range
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }

    // Check if we need to fetch data from API
    const existingCount = await this.weatherRepository.count(locationId, startDate, endDate);

    if (existingCount === 0) {
      // Fetch historical data from Open-Meteo
      try {
        const location = await this.locationsRepository.findById(locationId);
        if (!location) {
          throw new Error(`Location not found: ${locationId}`);
        }

        const historicalResponse = await this.openMeteoClient.getHistoricalWeather(
          location.latitude,
          location.longitude,
          OpenMeteoClient.formatDate(startDate),
          OpenMeteoClient.formatDate(endDate)
        );

        const historicalData = WeatherDataTransformer.transform(historicalResponse, locationId);

        if (historicalData.length > 0) {
          await this.weatherRepository.bulkInsert(historicalData, {
            overwriteForecasts: false, // Historical data should not overwrite
            validateData: true
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch historical weather data: ${error.message}`);
        // Continue with existing data
      }
    }

    return await this.weatherRepository.findByLocation(locationId, startDate, endDate, limit);
  }

  /**
   * Get aggregated weather data for a location
   */
  async getAggregatedWeather(
    locationId: string,
    interval: '15min' | '1hour' | '6hour' | '1day',
    hours: number
  ) {
    this.validateGuidFormat(locationId);
    return await this.weatherRepository.aggregateByInterval(locationId, interval, hours);
  }

  /**
   * Clean up old weather data
   */
  async cleanupOldData(olderThanDays: number = 90): Promise<number> {
    if (olderThanDays < 1) {
      throw new Error('olderThanDays must be at least 1');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    console.log(`Cleaning up weather data older than ${cutoffDate.toISOString()}`);

    return await this.weatherRepository.deleteOlderThan(cutoffDate);
  }

  /**
   * Validate GUID format
   */
  private validateGuidFormat(guid: string): void {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!guidRegex.test(guid)) {
      throw new Error(`Invalid GUID format: ${guid}`);
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}