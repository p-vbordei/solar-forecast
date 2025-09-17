import { ForecastRepository } from '../repositories/ForecastRepository';
import { forecastRepository as legacyRepository } from '$lib/server/repositories/forecast.repository';
import ExcelJS from 'exceljs';
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

        // Try to get real data from repository first
        let rawData = await this.repository.getForecastData(
            locationId,
            interval,
            startDate,
            endDate
        );

        // Fall back to legacy repository if no data
        if (!rawData || rawData.length === 0) {
            console.log(`No TimescaleDB data found, using legacy repository for location ${locationId}`);
            rawData = await legacyRepository.getForecastData(
                locationId,
                interval,
                startDate,
                endDate
            );
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

        // Fall back to legacy if needed
        if (!accuracyData || accuracyData.length === 0) {
            accuracyData = await legacyRepository.getAccuracyData(
                locationId,
                startDate,
                endDate
            );
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
                throw new Error('Python worker not available - using mock data fallback');
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
                                        isMockData: false
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

            // Check if we should fall back to mock data
            const shouldUseMockData = error.message && (
                error.message.includes('No historical data') ||
                error.message.includes('timeout') ||
                error.message.includes('not available') ||
                error.message.includes('mock data fallback')
            );

            if (shouldUseMockData) {
                console.warn('Falling back to mock forecast data:', error.message);

                // Generate mock forecast data
                const mockData = await this.generateEnhancedMockForecast(params);

                // Store mock data in database
                await this.repository.bulkInsertForecasts(mockData);

                const warningMessage = error.message.includes('timeout')
                    ? 'Python worker timeout. Using simulated data for demonstration.'
                    : error.message.includes('not available')
                    ? 'Python worker not available. Using simulated data for demonstration.'
                    : 'No historical data available. Using simulated data for demonstration.';

                return {
                    success: true,
                    forecastId: `mock_forecast_${Date.now()}`,
                    data: mockData,
                    metadata: {
                        generatedAt: new Date().toISOString(),
                        modelType: params.modelType,
                        horizonHours: params.horizonHours,
                        dataPoints: mockData.length,
                        isMockData: true,
                        message: warningMessage
                    }
                };
            }

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

        const validModelTypes = ['ML_ENSEMBLE', 'PHYSICS', 'HYBRID'];
        if (!validModelTypes.includes(params.modelType)) {
            throw new Error(`Invalid model type. Valid types: ${validModelTypes.join(', ')}`);
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
     * Calculate enhanced accuracy metrics
     */
    private calculateAccuracyMetrics(data: any): AccuracyMetrics {
        if (!data || data.length === 0) {
            return {
                accuracy: 0,
                mape: 0,
                rmse: 0,
                mae: 0,
                r2: 0,
                nrmse: 0,
                validPoints: 0
            };
        }

        let sumAPE = 0;
        let sumSquaredError = 0;
        let sumAbsoluteError = 0;
        let sumActual = 0;
        let sumForecast = 0;
        let sumActualSquared = 0;
        let sumForecastSquared = 0;
        let sumActualForecast = 0;
        let validPoints = 0;

        data.forEach((point: any) => {
            if (point.actual !== null && point.actual !== undefined &&
                point.forecast !== null && point.forecast !== undefined &&
                point.actual > 0) {

                const actual = parseFloat(point.actual);
                const forecast = parseFloat(point.forecast);
                const error = actual - forecast;
                const ape = Math.abs(error / actual) * 100;

                sumAPE += ape;
                sumSquaredError += error * error;
                sumAbsoluteError += Math.abs(error);
                sumActual += actual;
                sumForecast += forecast;
                sumActualSquared += actual * actual;
                sumForecastSquared += forecast * forecast;
                sumActualForecast += actual * forecast;
                validPoints++;
            }
        });

        if (validPoints === 0) {
            return {
                accuracy: 100,
                mape: 0,
                rmse: 0,
                mae: 0,
                r2: 0,
                nrmse: 0,
                validPoints: 0
            };
        }

        const mape = sumAPE / validPoints;
        const rmse = Math.sqrt(sumSquaredError / validPoints);
        const mae = sumAbsoluteError / validPoints;
        const meanActual = sumActual / validPoints;

        // Calculate R²
        const numerator = validPoints * sumActualForecast - sumActual * sumForecast;
        const denominator = Math.sqrt(
            (validPoints * sumActualSquared - sumActual * sumActual) *
            (validPoints * sumForecastSquared - sumForecast * sumForecast)
        );
        const r2 = denominator !== 0 ? Math.pow(numerator / denominator, 2) : 0;

        // Calculate NRMSE
        const nrmse = meanActual !== 0 ? (rmse / meanActual) * 100 : 0;

        // Enhanced accuracy calculation
        const accuracyFromMAPE = Math.max(0, 100 - mape);
        const accuracyFromR2 = r2 * 100;
        const accuracyFromNRMSE = Math.max(0, 100 - nrmse);
        const accuracy = (accuracyFromMAPE * 0.4 + accuracyFromR2 * 0.3 + accuracyFromNRMSE * 0.3);

        return {
            accuracy: Math.max(0, Math.min(100, accuracy)),
            mape: parseFloat(mape.toFixed(2)),
            rmse: parseFloat(rmse.toFixed(2)),
            mae: parseFloat(mae.toFixed(2)),
            r2: parseFloat(r2.toFixed(4)),
            nrmse: parseFloat(nrmse.toFixed(2)),
            validPoints
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

    /**
     * Generate enhanced mock forecast
     */
    private async generateEnhancedMockForecast(params: GenerateForecastRequest): Promise<BulkForecastInsert[]> {
        const { locationId, horizonHours, modelType, resolution = 'hourly' } = params;
        const forecasts: BulkForecastInsert[] = [];

        const timeStepMs = resolution === '15min' ? 15 * 60 * 1000 : 60 * 60 * 1000;
        const steps = resolution === '15min' ? horizonHours * 4 : horizonHours;
        const startTime = new Date();

        for (let i = 0; i < steps; i++) {
            const timestamp = new Date(startTime.getTime() + i * timeStepMs);
            const hour = timestamp.getHours();

            let baseForecast = 0;
            let confidence = 0.85;
            let energyMwh = 0;
            let capacityFactor = 0;

            // Simulate solar production pattern
            if (hour >= 6 && hour <= 18) {
                const peakHour = 12;
                const hourDiff = Math.abs(hour - peakHour);
                const maxPower = modelType === 'ML_ENSEMBLE' ? 45 :
                                modelType === 'PHYSICS' ? 42 : 43;

                baseForecast = maxPower * Math.exp(-(hourDiff * hourDiff) / 20);

                confidence = modelType === 'ML_ENSEMBLE' ? 0.90 + Math.random() * 0.08 :
                            modelType === 'PHYSICS' ? 0.88 + Math.random() * 0.10 :
                            0.85 + Math.random() * 0.12;

                // Add realistic variation
                baseForecast += (Math.random() - 0.5) * 8;
                baseForecast = Math.max(0, baseForecast);

                // Calculate energy and capacity factor
                energyMwh = baseForecast * (timeStepMs / (60 * 60 * 1000)); // Convert to MWh
                capacityFactor = baseForecast / 50; // Assuming 50MW nominal capacity
            }

            // Add weather parameters for realism
            const temperature = 20 + Math.random() * 15 - (hour < 6 || hour > 18 ? 5 : 0);
            const ghi = baseForecast > 0 ? 200 + baseForecast * 15 + Math.random() * 100 : 0;
            const cloudCover = baseForecast > 0 ? Math.max(0, 30 - baseForecast * 0.5) + Math.random() * 20 : 80;

            forecasts.push({
                locationId: locationId,
                timestamp,
                powerForecastMw: parseFloat(baseForecast.toFixed(2)),
                energyMwh: parseFloat(energyMwh.toFixed(3)),
                capacityFactor: parseFloat(capacityFactor.toFixed(3)),
                confidenceScore: parseFloat(confidence.toFixed(3)),
                modelType,
                horizonHours,
                temperature: parseFloat(temperature.toFixed(1)),
                ghi: parseFloat(ghi.toFixed(0)),
                cloudCover: parseFloat(cloudCover.toFixed(0)),
                windSpeed: parseFloat((3 + Math.random() * 5).toFixed(1))
            });
        }

        return forecasts;
    }

    /**
     * Export to CSV format
     */
    private exportToCSV(data: ForecastResponse): Buffer {
        const rows: string[] = [];

        // Header
        rows.push('Timestamp,Forecast,Upper Bound,Lower Bound,Actual,Measured');

        // Data rows
        data.data.forEach((point: any) => {
            rows.push([
                point.timestamp,
                point.forecast,
                point.confidence_upper,
                point.confidence_lower,
                point.actual || '',
                point.measured || ''
            ].join(','));
        });

        return Buffer.from(rows.join('\n'));
    }

    /**
     * Export to Excel format using ExcelJS
     */
    private async exportToExcel(data: ForecastResponse): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Forecast Data');

        // Set up columns
        worksheet.columns = [
            { header: 'Timestamp', key: 'timestamp', width: 20 },
            { header: 'Forecast (MW)', key: 'forecast', width: 15 },
            { header: 'Upper Bound (MW)', key: 'confidence_upper', width: 18 },
            { header: 'Lower Bound (MW)', key: 'confidence_lower', width: 18 },
            { header: 'Actual (MW)', key: 'actual', width: 15 },
            { header: 'Measured (MW)', key: 'measured', width: 15 }
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0FA4AF' }
        };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Add data rows
        data.data.forEach((point, index) => {
            const row = worksheet.addRow({
                timestamp: point.timestamp,
                forecast: point.forecast,
                confidence_upper: point.confidence_upper,
                confidence_lower: point.confidence_lower,
                actual: point.actual || null,
                measured: point.measured || null
            });

            // Alternate row colors
            if (index % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF5F5F5' }
                };
            }
        });

        // Add metadata sheet
        const metaSheet = workbook.addWorksheet('Metadata');
        metaSheet.columns = [
            { header: 'Property', key: 'property', width: 25 },
            { header: 'Value', key: 'value', width: 40 }
        ];

        metaSheet.getRow(1).font = { bold: true };
        metaSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0FA4AF' }
        };

        // Add metadata
        metaSheet.addRow({ property: 'Location ID', value: data.metadata.locationId });
        metaSheet.addRow({ property: 'Interval', value: data.metadata.interval });
        metaSheet.addRow({ property: 'Start Date', value: data.metadata.startDate || 'N/A' });
        metaSheet.addRow({ property: 'End Date', value: data.metadata.endDate || 'N/A' });
        metaSheet.addRow({ property: 'Data Points', value: data.metadata.dataPoints });
        metaSheet.addRow({ property: 'Generated At', value: data.metadata.generatedAt });
        metaSheet.addRow({ property: 'Has Actual Data', value: data.hasActual ? 'Yes' : 'No' });
        metaSheet.addRow({ property: 'Has Measured Data', value: data.hasMeasured ? 'Yes' : 'No' });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    /**
     * Export to PDF format - returns formatted JSON
     */
    private exportToPDF(data: ForecastResponse): Buffer {
        // PDF export not implemented, return formatted JSON
        const pdfContent = {
            title: 'Solar Forecast Report',
            generated: new Date().toISOString(),
            metadata: data.metadata,
            summary: {
                totalDataPoints: data.metadata.dataPoints,
                hasActualData: data.hasActual,
                hasMeasuredData: data.hasMeasured
            },
            data: data.data.slice(0, 100) // Limit to first 100 records for PDF
        };

        return Buffer.from(JSON.stringify(pdfContent, null, 2));
    }
}