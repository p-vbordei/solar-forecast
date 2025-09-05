import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { HistoricalService } from '$lib/server/services/historical.service';
import { HistoricalRepository } from '$lib/server/repositories/historical.repository';
import type { HistoricalDataRequest } from '$lib/types/historical';
import { AggregationType, DataQualityFilter } from '$lib/types/historical';

// Initialize service with CSR pattern
const historicalRepository = new HistoricalRepository();
const historicalService = new HistoricalService(historicalRepository);

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Extract and validate query parameters
    const location = url.searchParams.get('location');
    const locationIds = url.searchParams.get('locationIds');
    const interval = url.searchParams.get('interval') || 'hourly';
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const timezone = url.searchParams.get('timezone') || 'UTC';
    const includeWeather = url.searchParams.get('includeWeather') === 'true';
    const includeForecast = url.searchParams.get('includeForecast') === 'true';
    const includeStatistics = url.searchParams.get('includeStatistics') === 'true';
    const dataQuality = url.searchParams.get('dataQuality') || 'exclude_poor';

    // Validate required parameters
    if ((!location && !locationIds) || !start || !end) {
      return json(
        { 
          success: false, 
          error: 'Missing required parameters. Provide location/locationIds, start, and end dates.'
        },
        { status: 400 }
      );
    }

    // Parse location IDs
    let parsedLocationIds: number[] = [];
    try {
      if (locationIds) {
        parsedLocationIds = locationIds.split(',').map(id => parseInt(id.trim()));
      } else if (location) {
        parsedLocationIds = [parseInt(location)];
      }

      // Validate location IDs are numbers
      if (parsedLocationIds.some(id => isNaN(id))) {
        throw new Error('Invalid location ID format');
      }
    } catch (error) {
      return json(
        { success: false, error: 'Invalid location ID format. Use comma-separated integers.' },
        { status: 400 }
      );
    }

    // Map interval parameter to AggregationType
    let aggregationType: AggregationType;
    switch (interval.toLowerCase()) {
      case '15min':
      case 'fifteen_minutes':
        aggregationType = AggregationType.FIFTEEN_MINUTES;
        break;
      case '30min':
      case 'thirty_minutes':
        aggregationType = AggregationType.THIRTY_MINUTES;
        break;
      case 'hourly':
      case '1h':
        aggregationType = AggregationType.HOURLY;
        break;
      case 'daily':
      case '1d':
        aggregationType = AggregationType.DAILY;
        break;
      case 'weekly':
      case '1w':
        aggregationType = AggregationType.WEEKLY;
        break;
      case 'monthly':
      case '1m':
        aggregationType = AggregationType.MONTHLY;
        break;
      case 'raw':
        aggregationType = AggregationType.RAW;
        break;
      default:
        aggregationType = AggregationType.HOURLY;
    }

    // Map data quality filter
    let qualityFilter: DataQualityFilter[];
    switch (dataQuality) {
      case 'good_only':
        qualityFilter = [DataQualityFilter.GOOD_ONLY];
        break;
      case 'include_all':
        qualityFilter = [DataQualityFilter.INCLUDE_ALL];
        break;
      case 'exclude_poor':
      default:
        qualityFilter = [DataQualityFilter.EXCLUDE_POOR];
    }

    // Build request object
    const request: HistoricalDataRequest = {
      locationIds: parsedLocationIds,
      startDate: start,
      endDate: end,
      timezone,
      aggregation: aggregationType,
      includeProduction: true, // Always include production data
      includeWeather,
      includeForecast,
      includeAccuracy: includeForecast, // Include accuracy if forecast is requested
      includeMetadata: includeStatistics,
      dataQualityFilter: qualityFilter
    };

    // Get historical data using service (CSR pattern)
    const response = await historicalService.getHistoricalData(request);

    // Transform response for backward compatibility with existing frontend
    if (response.success) {
      const transformedData = response.data.map(point => ({
        timestamp: point.timestamp,
        location_id: point.locationId,
        location_name: point.locationName,
        production: point.production?.powerMW || 0,
        efficiency: point.production?.efficiency || 0,
        availability: point.production?.availability || 0,
        capacity_factor: point.production?.capacityFactor || 0,
        performance_ratio: point.production?.performanceRatio || 0,
        energy_yield: point.production?.energyMWh || 0,
        // Weather data (if included)
        ...(point.weather && {
          irradiance_actual: point.weather.ghi || 0,
          temperature_avg: point.weather.temperature || 0,
          wind_speed_avg: point.weather.windSpeed || 0
        }),
        // Forecast data (if included)
        ...(point.forecast && {
          forecast_production: point.forecast.powerMW || 0,
          forecast_confidence: point.forecast.confidenceLevel || 0
        }),
        // Data quality
        data_quality: point.dataQuality.overall,
        maintenance_flag: false, // Would be derived from alerts/maintenance logs
        anomaly_detected: point.dataQuality.overall === 'poor'
      }));

      return json({
        success: true,
        data: transformedData,
        metadata: {
          ...response.metadata,
          // Legacy compatibility fields
          location: parsedLocationIds.length === 1 ? parsedLocationIds[0].toString() : 'multiple',
          interval,
          dataPoints: transformedData.length,
          dataType: 'historical_production'
        },
        statistics: response.statistics
      });
    } else {
      return json(response, { status: 500 });
    }

  } catch (error) {
    console.error('Historical data API error:', error);
    
    // Provide specific error messages for common issues
    let errorMessage = 'Failed to fetch historical data';
    if (error instanceof Error) {
      if (error.message.includes('Invalid date range')) {
        errorMessage = 'Invalid date range. Ensure start date is before end date and within 5-year limit.';
      } else if (error.message.includes('location ID')) {
        errorMessage = 'Invalid location ID. Ensure location exists and you have access.';
      } else if (error.message.includes('Raw data queries')) {
        errorMessage = 'Raw data requests are limited to 30 days maximum. Use aggregated data for longer periods.';
      } else if (error.message.includes('Maximum')) {
        errorMessage = error.message; // Pass through limit messages
      } else {
        errorMessage = error.message;
      }
    }

    return json(
      { 
        success: false, 
        error: errorMessage,
        data: [],
        metadata: {
          request: {
            locationIds: [],
            startDate: url.searchParams.get('start') || '',
            endDate: url.searchParams.get('end') || '',
            aggregation: AggregationType.HOURLY,
            timezone: 'UTC'
          },
          response: {
            totalRecords: 0,
            locations: [],
            dateRange: {
              start: url.searchParams.get('start') || '',
              end: url.searchParams.get('end') || '',
              dayCount: 0
            },
            processing: {
              queryTimeMs: 0,
              generatedAt: new Date().toISOString()
            }
          }
        }
      },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body || typeof body !== 'object') {
      return json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Use POST body directly as HistoricalDataRequest
    const historicalRequest: HistoricalDataRequest = {
      locationIds: body.locationIds,
      locationId: body.locationId,
      startDate: body.startDate,
      endDate: body.endDate,
      timezone: body.timezone || 'UTC',
      aggregation: body.aggregation || AggregationType.HOURLY,
      includeProduction: body.includeProduction !== false, // Default true
      includeWeather: body.includeWeather || false,
      includeForecast: body.includeForecast || false,
      includeAccuracy: body.includeAccuracy || false,
      includeMetadata: body.includeMetadata || false,
      dataQualityFilter: body.dataQualityFilter || [DataQualityFilter.EXCLUDE_POOR],
      minCapacityFactor: body.minCapacityFactor,
      maxCapacityFactor: body.maxCapacityFactor
    };

    // Get historical data using service
    const response = await historicalService.getHistoricalData(historicalRequest);

    return json(response, { 
      status: response.success ? 200 : 500 
    });

  } catch (error) {
    console.error('Historical data POST API error:', error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process request',
        data: [],
        metadata: {
          request: {
            locationIds: [],
            startDate: '',
            endDate: '',
            aggregation: AggregationType.HOURLY,
            timezone: 'UTC'
          },
          response: {
            totalRecords: 0,
            locations: [],
            dateRange: { start: '', end: '', dayCount: 0 },
            processing: {
              queryTimeMs: 0,
              generatedAt: new Date().toISOString()
            }
          }
        }
      },
      { status: 500 }
    );
  }
};