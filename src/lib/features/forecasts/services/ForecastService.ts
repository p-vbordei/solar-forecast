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

        try {
            // TODO: Replace with actual Python worker API call
            // const pythonWorkerResponse = await fetch('http://localhost:8001/api/forecasts/generate', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(params)
            // });

            // For now, generate enhanced mock forecast
            const mockForecastData = await this.generateEnhancedMockForecast(params);

            // Store forecast in database using repository bulk insert
            await this.repository.bulkInsertForecasts(mockForecastData);

            return {
                success: true,
                forecastId: `forecast_${Date.now()}`,
                data: mockForecastData,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    modelType: params.modelType,
                    horizonHours: params.horizonHours,
                    dataPoints: mockForecastData.length
                }
            };
        } catch (error) {
            console.error('Forecast generation failed:', error);
            throw new Error(`Failed to generate forecast: ${error.message}`);
        }
    }

    /**
     * Get forecast statistics
     */
    async getForecastStatistics(locationId: string, days: number = 30) {
        return await this.repository.getForecastStatistics(locationId, days);
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

        const validModelTypes = ['lstm', 'xgboost', 'random_forest', 'arima', 'prophet', 'ensemble'];
        if (!validModelTypes.includes(params.modelType.toLowerCase())) {
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

            if (hour >= 6 && hour <= 18) {
                const peakHour = 12;
                const hourDiff = Math.abs(hour - peakHour);
                const maxPower = modelType === 'lstm' ? 52 :
                                modelType === 'xgboost' ? 48 : 45;

                baseForecast = maxPower * Math.exp(-(hourDiff * hourDiff) / 20);

                confidence = modelType === 'lstm' ? 0.90 + Math.random() * 0.08 :
                            modelType === 'xgboost' ? 0.88 + Math.random() * 0.10 :
                            0.85 + Math.random() * 0.12;

                baseForecast += (Math.random() - 0.5) * 8;
                baseForecast = Math.max(0, baseForecast);
            }

            forecasts.push({
                locationId: parseInt(locationId),
                timestamp,
                powerForecastMw: parseFloat(baseForecast.toFixed(2)),
                confidenceScore: parseFloat(confidence.toFixed(3)),
                modelType,
                horizonHours
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