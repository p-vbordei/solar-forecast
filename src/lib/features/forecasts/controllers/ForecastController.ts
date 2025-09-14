import type { RequestEvent } from '@sveltejs/kit';
import { ForecastService } from '../services/ForecastService';
import { ApiResponse } from '$lib/utils/ApiResponse';
import { withErrorHandling } from '$lib/utils/ErrorHandler';
import { BadRequestError } from '$lib/utils/ApiErrors';
import type {
    ForecastParameters,
    AccuracyParameters,
    ExportParameters,
    GenerateForecastRequest
} from '../models/dto/forecast';

/**
 * Controller layer for forecast endpoints
 * Handles HTTP requests and responses for forecast operations
 */
export class ForecastController {
    private forecastService = new ForecastService();

    /**
     * GET /api/forecasts
     * Get forecast data with optional filtering
     */
    async getForecast(event: RequestEvent): Promise<Response> {
        return withErrorHandling(async () => {
            const { url } = event;

            // Get query parameters
            const locationId = url.searchParams.get('location_id');
            const interval = url.searchParams.get('interval') as ForecastParameters['interval'];
            const startDate = url.searchParams.get('start_date');
            const endDate = url.searchParams.get('end_date');

            // Validate required parameters
            if (!locationId) {
                throw new BadRequestError('Location ID is required', 'location_id');
            }

            if (!interval || !['15min', 'hourly', 'daily', 'weekly'].includes(interval)) {
                throw new BadRequestError('Valid interval is required (15min, hourly, daily, weekly)', 'interval');
            }

            // Call service layer
            const result = await this.forecastService.getForecast({
                locationId,
                interval,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            });

            return ApiResponse.success(result);
        })();
    }

    /**
     * POST /api/forecasts/generate
     * Generate a new forecast
     */
    async generateForecast(event: RequestEvent): Promise<Response> {
        return withErrorHandling(async () => {
            // Parse request body
            const requestData: GenerateForecastRequest = await event.request.json();

            // Validate required fields
            if (!requestData.locationId) {
                throw new BadRequestError('Location ID is required', 'locationId');
            }

            if (!requestData.horizonHours || ![24, 48, 72].includes(requestData.horizonHours)) {
                throw new BadRequestError('Horizon hours must be 24, 48, or 72', 'horizonHours');
            }

            if (!requestData.modelType) {
                throw new BadRequestError('Model type is required', 'modelType');
            }

            // Call service layer to generate forecast
            const result = await this.forecastService.generateForecast(requestData);

            return ApiResponse.created(result, 'Forecast generated successfully');
        })();
    }

    /**
     * GET /api/forecasts/accuracy
     * Get accuracy metrics for forecasts
     */
    async getAccuracyMetrics(event: RequestEvent): Promise<Response> {
        return withErrorHandling(async () => {
            const { url } = event;

            // Get query parameters
            const locationId = url.searchParams.get('location_id');
            const startDate = url.searchParams.get('start_date');
            const endDate = url.searchParams.get('end_date');

            // Validate required parameters
            if (!locationId) {
                throw new BadRequestError('Location ID is required', 'location_id');
            }

            // Call service layer
            const metrics = await this.forecastService.getAccuracyMetrics({
                locationId,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            });

            return ApiResponse.success(metrics);
        })();
    }

    /**
     * GET /api/forecasts/export
     * Export forecast data in various formats
     */
    async exportForecast(event: RequestEvent): Promise<Response> {
        return withErrorHandling(async () => {
            const { url } = event;

            // Get query parameters
            const locationId = url.searchParams.get('location_id');
            const interval = url.searchParams.get('interval') as ForecastParameters['interval'];
            const format = url.searchParams.get('format') as ExportParameters['format'];
            const startDate = url.searchParams.get('start_date');
            const endDate = url.searchParams.get('end_date');

            // Validate required parameters
            if (!locationId) {
                throw new BadRequestError('Location ID is required', 'location_id');
            }

            if (!interval || !['15min', 'hourly', 'daily', 'weekly'].includes(interval)) {
                throw new BadRequestError('Valid interval is required', 'interval');
            }

            if (!format || !['csv', 'excel', 'pdf'].includes(format)) {
                throw new BadRequestError('Valid format is required (csv, excel, pdf)', 'format');
            }

            // Call service layer
            const buffer = await this.forecastService.exportForecast({
                locationId,
                interval,
                format,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            });

            // Set appropriate headers based on format
            const headers: Record<string, string> = {
                'Content-Disposition': `attachment; filename="forecast_${locationId}_${new Date().toISOString()}.${format === 'excel' ? 'xlsx' : format}"`
            };

            if (format === 'csv') {
                headers['Content-Type'] = 'text/csv';
            } else if (format === 'excel') {
                headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            } else if (format === 'pdf') {
                headers['Content-Type'] = 'application/json'; // Since PDF returns JSON for now
            }

            return new Response(buffer, {
                status: 200,
                headers
            });
        })();
    }

    /**
     * GET /api/forecasts/statistics
     * Get forecast statistics for a location
     */
    async getForecastStatistics(event: RequestEvent): Promise<Response> {
        return withErrorHandling(async () => {
            const { url } = event;

            // Get query parameters
            const locationId = url.searchParams.get('location_id');
            const days = parseInt(url.searchParams.get('days') || '30');

            // Validate parameters
            if (!locationId) {
                throw new BadRequestError('Location ID is required', 'location_id');
            }

            if (days < 1 || days > 365) {
                throw new BadRequestError('Days must be between 1 and 365', 'days');
            }

            // Call service layer
            const statistics = await this.forecastService.getForecastStatistics(locationId, days);

            if (!statistics) {
                return ApiResponse.success({
                    message: 'No statistics available for this location',
                    locationId,
                    days
                });
            }

            return ApiResponse.success(statistics);
        })();
    }
}