import { ForecastRepository } from '../repositories/ForecastRepository';
import {
    ForecastMetricsCalculator,
    ModelValidator,
    ForecastExportEngine,
    prepareExportData,
    type ForecastData,
    type AccuracyMetrics as SharedAccuracyMetrics
} from '$lib/shared/forecast';
import type {
    ForecastParameters,
    AccuracyParameters,
    ExportParameters,
    GenerateForecastRequest,
    ForecastResponse,
    AccuracyMetrics,
    BulkForecastInsert
} from '../models/dto/forecast';

/**
 * Service layer for forecast business logic
 * Handles forecast generation, accuracy calculations, and data processing
 */
export class ForecastService {
    private repository = new ForecastRepository();

    /**
     * Get forecast data with processing
     */
    async getForecast(params: ForecastParameters): Promise<ForecastResponse> {
        const { locationId, interval, startDate, endDate } = params;

        // Validate GUID format
        this.validateGuidFormat(locationId);

        // Get data from repository
        let rawData = await this.repository.getForecastData(
            locationId,
            interval,
            startDate,
            endDate
        );

        // If no data available, return empty dataset with proper structure
        if (!rawData || rawData.length === 0) {
            console.log(`No forecast data found for location ${locationId}`);
            rawData = [];
        }

        // Process and format data based on interval
        const processedData = this.processForecastData(rawData, interval);

        // Check if actual and measured data are available
        const hasActual = processedData.some(d => d.actual !== null && d.actual !== undefined);
        const hasMeasured = processedData.some(d => d.measured !== null && d.measured !== undefined);

        return {
            data: processedData,
            hasActual,
            hasMeasured,
            metadata: {
                locationId,
                interval,
                startDate,
                endDate,
                dataPoints: processedData.length,
                generatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Get accuracy metrics with enhanced calculations
     */
    async getAccuracyMetrics(params: AccuracyParameters): Promise<AccuracyMetrics> {
        const { locationId, startDate, endDate } = params;

        // Validate GUID format
        this.validateGuidFormat(locationId);

        // Get accuracy data from repository
        let accuracyData = await this.repository.getAccuracyData(
            locationId,
            startDate,
            endDate
        );

        // If no data available, use empty dataset
        if (!accuracyData || accuracyData.length === 0) {
            console.log(`No accuracy data found for location ${locationId}`);
            accuracyData = [];
        }

        // Calculate metrics
        return this.calculateAccuracyMetrics(accuracyData);
    }

    /**
     * Export forecast data in various formats
     */
    async exportForecast(params: ExportParameters): Promise<Buffer> {
        const { format, ...forecastParams } = params;

        // Get forecast data
        const forecastData = await this.getForecast(forecastParams);

        // Export based on format
        switch (format) {
            case 'csv':
                return this.exportToCSV(forecastData);
            case 'excel':
                return this.exportToExcel(forecastData);
            case 'pdf':
                return this.exportToPDF(forecastData);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Generate new forecast
     */
    async generateForecast(params: GenerateForecastRequest) {
        // Validate parameters
        this.validateGenerateForecastRequest(params);

        // Validate GUID format
        this.validateGuidFormat(params.locationId);

        try {
            // Get Python worker URL from environment
            const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';

            // Call Python worker API for forecast generation
            // No timeout here - we'll handle async processing with polling
            let pythonWorkerResponse;
            try {
                pythonWorkerResponse = await fetch(`${pythonWorkerUrl}/api/v1/forecasts/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        location_id: params.locationId,  // Python worker expects GUID string
                        forecast_hours: params.horizonHours,
                        model_type: params.modelType,  // Pass model type directly as received
                        use_weather: params.useWeather !== false,  // Default to true
                        confidence_level: params.confidenceLevel || 0.95
                    })
                });
            } catch (fetchError) {
                // Connection error
                console.warn('Python worker connection failed:', fetchError);
                throw new Error('Python worker not available');
            }

            if (!pythonWorkerResponse.ok) {
                const errorData = await pythonWorkerResponse.json().catch(() => ({}));

                // Check for specific error cases
                if (pythonWorkerResponse.status === 400) {
                    const errorMessage = errorData.detail || errorData.error || '';

                    // Check if it's a missing historical data error
                    if (errorMessage.toLowerCase().includes('no historical data') ||
                        errorMessage.toLowerCase().includes('insufficient data') ||
                        errorMessage.toLowerCase().includes('no data found')) {
                        throw new Error(`Cannot generate forecast: No historical data available for this location. CatBoost requires historical production data to train the model. Please ensure production data has been recorded for this location before attempting to generate forecasts.`);
                    }

                    // Other validation errors
                    throw new Error(`Forecast generation failed: ${errorMessage}`);
                }

                throw new Error(errorData.detail || `Python worker returned ${pythonWorkerResponse.status}`);
            }

            const forecastResult = await pythonWorkerResponse.json();

            // Check if task_id was returned (async processing)
            if (forecastResult.task_id) {
                console.log('Python worker returned task ID:', forecastResult.task_id);

                // Poll for task completion
                const maxAttempts = 30; // 30 seconds timeout
                let attempts = 0;

                while (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                    attempts++;

                    console.log(`Polling task status (attempt ${attempts}/${maxAttempts})...`);

                    const statusResponse = await fetch(
                        `${pythonWorkerUrl}/api/v1/forecasts/task/${forecastResult.task_id}`
                    );

                    if (statusResponse.ok) {
                        const statusData = await statusResponse.json();
                        console.log('Task status:', statusData.status);

                        if (statusData.status === 'completed') {
                            console.log('Task completed successfully!');
                            // Transform and store forecast data
                            const transformedData = this.transformPythonWorkerResponse(
                                statusData.result,
                                params
                            );

                            // Store in database
                            await this.repository.bulkInsertForecasts(transformedData);

                            return {
                                success: true,
                                forecastId: forecastResult.task_id,
                                data: transformedData,
                                metadata: {
                                    generatedAt: new Date().toISOString(),
                                    modelType: params.modelType,
                                    horizonHours: params.horizonHours,
                                    dataPoints: transformedData.length
                                }
                            };
                        } else if (statusData.status === 'failed') {
                            console.error('Task failed:', statusData.error);
                            throw new Error(statusData.error || 'Forecast generation failed');
                        }
                    } else if (statusResponse.status === 404) {
                        // Task not found - Python worker might have completed it already
                        // Try to get forecasts directly
                        console.log('Task not found, checking for completed forecasts...');

                        const forecastsResponse = await fetch(
                            `${pythonWorkerUrl}/api/v1/forecasts/location/${params.locationId}`
                        );

                        if (forecastsResponse.ok) {
                            const forecasts = await forecastsResponse.json();
                            if (forecasts && forecasts.length > 0) {
                                console.log('Found', forecasts.length, 'forecasts from Python worker');

                                // Transform the forecasts to our format
                                // Get the base time from the first forecast or use current time
                                const firstTime = forecasts[0]?.time || forecasts[0]?.timestamp;
                                const baseTime = firstTime ? new Date(firstTime) : new Date();

                                const transformedData = forecasts.slice(0, params.horizonHours).map((f: any, index: number) => {
                                    // Always create incremental timestamps to avoid duplicates
                                    // Each forecast is 1 hour apart
                                    const timestamp = new Date(baseTime.getTime() + index * 60 * 60 * 1000);

                                    return {
                                        locationId: params.locationId,
                                        timestamp: timestamp,
                                        powerForecastMw: f.power_output_mw || f.power_mw || 0,
                                        energyMwh: f.energy_mwh || 0,
                                        capacityFactor: f.capacity_factor || 0,
                                        confidenceScore: f.quality_score || f.confidence_score || 0.95,
                                        modelType: f.model_type || params.modelType,
                                        horizonHours: params.horizonHours,
                                        temperature: f.temperature || f.temperature_c,
                                        ghi: f.ghi || f.ghi_w_m2,
                                        dni: f.dni || f.dni_w_m2,
                                        cloudCover: f.cloud_cover || f.cloud_cover_percent,
                                        windSpeed: f.wind_speed || f.wind_speed_ms
                                    };
                                });

                                // Log timestamp uniqueness check
                                const timestamps = transformedData.map(d => d.timestamp.toISOString());
                                const uniqueTimestamps = [...new Set(timestamps)];
                                console.log(`Timestamp check: ${uniqueTimestamps.length} unique out of ${timestamps.length} total`);
                                if (uniqueTimestamps.length < timestamps.length) {
                                    console.warn('Duplicate timestamps detected!', timestamps.slice(0, 5));
                                }

                                // Store in our database
                                await this.repository.bulkInsertForecasts(transformedData);

                                return {
                                    success: true,
                                    forecastId: forecastResult.task_id,
                                    data: transformedData,
                                    metadata: {
                                        generatedAt: new Date().toISOString(),
                                        modelType: params.modelType,
                                        horizonHours: params.horizonHours,
                                        dataPoints: transformedData.length,
                                        isRealData: true
                                    }
                                };
                            }
                        }

                        console.log('Task not found and no forecasts available');
                    }
                }

                console.error('Forecast generation timeout after', maxAttempts, 'seconds');
                throw new Error('Forecast generation timeout');
            } else {
                // Direct response (synchronous)
                const transformedData = this.transformPythonWorkerResponse(
                    forecastResult,
                    params
                );

                // Store in database
                await this.repository.bulkInsertForecasts(transformedData);

                return {
                    success: true,
                    forecastId: `forecast_${Date.now()}`,
                    data: transformedData,
                    metadata: {
                        generatedAt: new Date().toISOString(),
                        modelType: params.modelType,
                        horizonHours: params.horizonHours,
                        dataPoints: transformedData.length
                    }
                };
            }
        } catch (error) {
            console.error('Forecast generation failed:', error);

            // No mock data - only real forecasts from Python worker

            // Re-throw the error with more context
            throw new Error(`Failed to generate forecast: ${error.message}`);
        }
    }

    /**
     * Get forecast statistics
     */
    async getForecastStatistics(locationId: string, days: number = 30) {
        // Validate GUID format
        this.validateGuidFormat(locationId);

        return await this.repository.getForecastStatistics(locationId, days);
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
     * Validate forecast generation request
     */
    private validateGenerateForecastRequest(params: GenerateForecastRequest): void {
        if (!params.locationId) {
            throw new Error('Location ID is required');
        }

        if (![24, 48, 72].includes(params.horizonHours)) {
            throw new Error('Horizon hours must be 24, 48, or 72');
        }

        if (!params.modelType) {
            throw new Error('Model type is required');
        }

        // Use shared model validator
        if (!ModelValidator.isValidModelType(params.modelType)) {
            throw new Error(ModelValidator.getValidationErrorMessage(params.modelType));
        }
    }

    /**
     * Process raw forecast data
     */
    private processForecastData(rawData: any[], interval: string) {
        return rawData.map(point => {
            const processed: any = {
                timestamp: point.timestamp || point.bucket,
                forecast: point.forecast || point.avg_power_forecast_mw || 0,
                confidence_upper: (point.forecast || point.avg_power_forecast_mw || 0) * 1.1,
                confidence_lower: (point.forecast || point.avg_power_forecast_mw || 0) * 0.9
            };

            if (point.actual !== undefined) {
                processed.actual = point.actual;
            }

            if (point.measured !== undefined) {
                processed.measured = point.measured;
            }

            return processed;
        });
    }

    /**
     * Calculate enhanced accuracy metrics using shared calculator
     */
    private calculateAccuracyMetrics(data: any): AccuracyMetrics {
        // Transform data to shared format
        const forecastData: ForecastData[] = data.map((point: any) => ({
            timestamp: point.timestamp || new Date().toISOString(),
            forecast: point.forecast || 0,
            actual: point.actual || null,
            measured: point.measured || null
        }));

        // Use shared metrics calculator
        const sharedMetrics = ForecastMetricsCalculator.calculateAccuracyMetrics(forecastData);

        // Convert to local format (add validPoints for backwards compatibility)
        return {
            accuracy: sharedMetrics.accuracy,
            mape: sharedMetrics.mape,
            rmse: sharedMetrics.rmse,
            mae: sharedMetrics.mae,
            r2: sharedMetrics.r2,
            nrmse: sharedMetrics.nrmse || 0,
            validPoints: sharedMetrics.sample_count
        };
    }

    /**
     * Transform Python worker response to database format
     */
    private transformPythonWorkerResponse(
        pythonResponse: any,
        params: GenerateForecastRequest
    ): BulkForecastInsert[] {
        const forecasts: BulkForecastInsert[] = [];

        // Handle both direct forecasts and nested structure
        const forecastData = pythonResponse.forecasts || pythonResponse;

        if (Array.isArray(forecastData)) {
            forecastData.forEach((point: any) => {
                forecasts.push({
                    locationId: params.locationId,
                    timestamp: new Date(point.timestamp),
                    powerForecastMw: parseFloat(point.power_forecast_mw || point.forecast || 0),
                    confidenceScore: parseFloat(
                        point.confidence_score ||
                        point.confidence ||
                        0.85
                    ),
                    modelType: params.modelType,
                    horizonHours: params.horizonHours
                });
            });
        } else if (forecastData.timestamps && forecastData.values) {
            // Handle separate arrays format
            const timestamps = forecastData.timestamps;
            const values = forecastData.values;
            const lowerBounds = forecastData.lower_bounds || [];
            const upperBounds = forecastData.upper_bounds || [];

            for (let i = 0; i < timestamps.length; i++) {
                const confidence = this.calculateConfidenceFromBounds(
                    values[i],
                    lowerBounds[i],
                    upperBounds[i]
                );

                forecasts.push({
                    locationId: params.locationId,
                    timestamp: new Date(timestamps[i]),
                    powerForecastMw: parseFloat(values[i] || 0),
                    confidenceScore: confidence,
                    modelType: params.modelType,
                    horizonHours: params.horizonHours
                });
            }
        }

        return forecasts;
    }

    /**
     * Calculate confidence score from prediction bounds
     */
    private calculateConfidenceFromBounds(
        value: number,
        lowerBound?: number,
        upperBound?: number
    ): number {
        if (lowerBound !== undefined && upperBound !== undefined && value > 0) {
            const range = upperBound - lowerBound;
            const relativeRange = range / value;
            // Convert relative range to confidence (smaller range = higher confidence)
            return Math.max(0.5, Math.min(1.0, 1.0 - relativeRange / 2));
        }
        return 0.85; // Default confidence
    }

    // Removed mock forecast generation - only real data from Python worker

    /**
     * Export using shared export engine
     */
    private async exportToCSV(data: ForecastResponse): Promise<Buffer> {
        const exportData = this.prepareSharedExportData(data);
        return await ForecastExportEngine.exportData(exportData, 'csv');
    }

    /**
     * Export using shared export engine
     */
    private async exportToExcel(data: ForecastResponse): Promise<Buffer> {
        const exportData = this.prepareSharedExportData(data);
        return await ForecastExportEngine.exportData(exportData, 'excel');
    }

    /**
     * Export using shared export engine
     */
    private exportToPDF(data: ForecastResponse): Buffer {
        const exportData = this.prepareSharedExportData(data);
        return ForecastExportEngine.exportData(exportData, 'pdf');
    }

    /**
     * Prepare data for shared export engine
     */
    private prepareSharedExportData(data: ForecastResponse) {
        // Transform forecast response to shared export format
        const forecastData: ForecastData[] = data.data.map((point: any) => ({
            timestamp: point.timestamp,
            forecast: point.forecast,
            actual: point.actual || null,
            measured: point.measured || null,
            confidence_upper: point.confidence_upper || null,
            confidence_lower: point.confidence_lower || null
        }));

        return prepareExportData(
            forecastData,
            data.metadata.locationId,
            `Location ${data.metadata.locationId}`,
            data.metadata.interval as any,
            data.metadata.startDate,
            data.metadata.endDate
        );
    }
}