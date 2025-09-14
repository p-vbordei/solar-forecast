import type { RequestEvent } from '@sveltejs/kit';
import { WeatherService } from '../services/WeatherService';
import { ApiResponse } from '../../../utils/ApiResponse';
import { ErrorHandler, withErrorHandling } from '../../../utils/ErrorHandler';
import { BadRequestError } from '../../../utils/ApiErrors';
import { validateSyncWeatherRequest } from '../models/requests/SyncWeatherRequest';
import { validateFetchWeatherRequest } from '../models/requests/FetchWeatherRequest';
import { WeatherDataTransformer } from '../helpers/WeatherDataTransformer';

/**
 * Controller layer for weather API endpoints
 * Handles HTTP requests, validation, and response formatting
 */
export class WeatherController {
  private weatherService = new WeatherService();

  /**
   * GET /api/weather
   * Get current weather data for a location
   */
  async getWeather(event: RequestEvent): Promise<Response> {
    return withErrorHandling(async () => {
      const { url } = event;

      // Extract and validate query parameters
      const locationId = url.searchParams.get('location_id');
      if (!locationId) {
        throw new BadRequestError('location_id query parameter is required', 'location_id');
      }

      // Validate GUID format
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidRegex.test(locationId)) {
        throw new BadRequestError('location_id must be a valid GUID', 'location_id');
      }

      // Get weather data from service
      const weatherData = await this.weatherService.getCurrentWeather(locationId);

      // Transform for API response
      const apiData = weatherData.map(WeatherDataTransformer.transformForApi);

      return ApiResponse.success({
        locationId,
        currentWeather: apiData,
        recordCount: apiData.length,
        source: 'open-meteo',
        generatedAt: new Date().toISOString()
      });

    })();
  }

  /**
   * GET /api/weather/forecast
   * Get weather forecast for a location
   */
  async getForecast(event: RequestEvent): Promise<Response> {
    return withErrorHandling(async () => {
      const { url } = event;

      // Extract and validate query parameters
      const locationId = url.searchParams.get('location_id');
      if (!locationId) {
        throw new BadRequestError('location_id query parameter is required', 'location_id');
      }

      // Validate GUID format
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidRegex.test(locationId)) {
        throw new BadRequestError('location_id must be a valid GUID', 'location_id');
      }

      // Validate days parameter
      const daysParam = url.searchParams.get('days');
      let days = 7; // default
      if (daysParam) {
        days = parseInt(daysParam);
        if (isNaN(days) || days < 1 || days > 16) {
          throw new BadRequestError('days must be between 1 and 16', 'days');
        }
      }

      // Get forecast data from service
      const forecast = await this.weatherService.getForecast(locationId, days);

      // Transform for API response
      const apiData = forecast.forecastData.map(WeatherDataTransformer.transformForApi);

      return ApiResponse.success({
        locationId: forecast.locationId,
        forecastDays: days,
        forecast: apiData,
        recordCount: apiData.length,
        source: forecast.source,
        generatedAt: forecast.generatedAt.toISOString(),
        validUntil: forecast.validUntil.toISOString()
      });

    })();
  }

  /**
   * POST /api/weather/sync
   * Synchronize weather data for all or specific locations
   */
  async syncWeather(event: RequestEvent): Promise<Response> {
    return withErrorHandling(async () => {
      let syncRequest;

      try {
        syncRequest = await event.request.json();
      } catch (error) {
        throw new BadRequestError('Invalid JSON in request body', 'body');
      }

      // Validate sync request
      const validationErrors = validateSyncWeatherRequest(syncRequest);
      if (validationErrors.length > 0) {
        throw new BadRequestError(
          `Validation failed: ${validationErrors.join(', ')}`,
          'body'
        );
      }

      // Execute sync
      const syncResponse = await this.weatherService.syncAllLocations(syncRequest);

      // Return appropriate response based on success
      if (syncResponse.success) {
        return ApiResponse.success(syncResponse, 'Weather synchronization completed successfully');
      } else {
        return ApiResponse.error(
          syncResponse.message,
          500,
          'Weather synchronization completed with errors',
          undefined,
          'SYNC_PARTIAL_FAILURE'
        );
      }

    })();
  }

  /**
   * GET /api/weather/{id}
   * Get specific weather record by ID
   */
  async getWeatherById(event: RequestEvent): Promise<Response> {
    return withErrorHandling(async () => {
      const weatherId = event.params.id!; // ID is mandatory in path

      // Validate GUID format
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidRegex.test(weatherId)) {
        throw new BadRequestError('id must be a valid GUID', 'id');
      }

      // Get weather record from service
      const weatherRecord = await this.weatherService.getWeatherById(weatherId);

      // Transform for API response
      const apiData = WeatherDataTransformer.transformForApi(weatherRecord);

      return ApiResponse.success(apiData);

    })();
  }

  /**
   * GET /api/weather/historical
   * Get historical weather data for a location
   */
  async getHistoricalWeather(event: RequestEvent): Promise<Response> {
    return withErrorHandling(async () => {
      const { url } = event;

      // Extract and validate query parameters
      const locationId = url.searchParams.get('location_id');
      if (!locationId) {
        throw new BadRequestError('location_id query parameter is required', 'location_id');
      }

      // Validate GUID format
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidRegex.test(locationId)) {
        throw new BadRequestError('location_id must be a valid GUID', 'location_id');
      }

      // Validate date parameters
      const startDateParam = url.searchParams.get('start_date');
      const endDateParam = url.searchParams.get('end_date');

      if (!startDateParam || !endDateParam) {
        throw new BadRequestError('start_date and end_date query parameters are required', 'date_range');
      }

      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestError('start_date and end_date must be valid ISO dates', 'date_format');
      }

      if (startDate >= endDate) {
        throw new BadRequestError('start_date must be before end_date', 'date_range');
      }

      // Validate limit parameter
      const limitParam = url.searchParams.get('limit');
      let limit = 1000; // default
      if (limitParam) {
        limit = parseInt(limitParam);
        if (isNaN(limit) || limit < 1 || limit > 5000) {
          throw new BadRequestError('limit must be between 1 and 5000', 'limit');
        }
      }

      // Get historical data from service
      const historicalData = await this.weatherService.getHistoricalWeather(
        locationId,
        startDate,
        endDate,
        limit
      );

      // Transform for API response
      const apiData = historicalData.map(WeatherDataTransformer.transformForApi);

      return ApiResponse.success({
        locationId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        historicalWeather: apiData,
        recordCount: apiData.length,
        source: 'open-meteo'
      });

    })();
  }

  /**
   * GET /api/weather/aggregated
   * Get aggregated weather data for a location
   */
  async getAggregatedWeather(event: RequestEvent): Promise<Response> {
    return withErrorHandling(async () => {
      const { url } = event;

      // Extract and validate query parameters
      const locationId = url.searchParams.get('location_id');
      if (!locationId) {
        throw new BadRequestError('location_id query parameter is required', 'location_id');
      }

      // Validate GUID format
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidRegex.test(locationId)) {
        throw new BadRequestError('location_id must be a valid GUID', 'location_id');
      }

      // Validate interval parameter
      const interval = url.searchParams.get('interval') || '1hour';
      if (!['15min', '1hour', '6hour', '1day'].includes(interval)) {
        throw new BadRequestError('interval must be one of: 15min, 1hour, 6hour, 1day', 'interval');
      }

      // Validate hours parameter
      const hoursParam = url.searchParams.get('hours');
      let hours = 24; // default
      if (hoursParam) {
        hours = parseInt(hoursParam);
        if (isNaN(hours) || hours < 1 || hours > 720) { // Max 30 days
          throw new BadRequestError('hours must be between 1 and 720 (30 days)', 'hours');
        }
      }

      // Get aggregated data from service
      const aggregatedData = await this.weatherService.getAggregatedWeather(
        locationId,
        interval as any,
        hours
      );

      return ApiResponse.success({
        locationId,
        interval,
        hours,
        aggregatedData,
        recordCount: aggregatedData.length,
        generatedAt: new Date().toISOString()
      });

    })();
  }
}