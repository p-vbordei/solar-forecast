/**
 * Unified forecast utilities and types
 * Single source of truth for all forecast-related functionality
 * Eliminates duplication across Python Worker, Features Service, and Legacy Service
 */

// Export all types
export type {
    ForecastData,
    AccuracyMetrics,
    ConfidenceBounds,
    ModelValidationResult,
    ModelType,
    ExportFormat,
    ForecastInterval,
    ExportData,
    ForecastStatistics,
    ValidationConfig
} from './types';

// Export all calculators and engines
export { ForecastMetricsCalculator } from './MetricsCalculator';
export { ModelValidator } from './ModelValidator';
export { ForecastExportEngine } from './ExportEngine';
export { ForecastStatisticsCalculator } from './StatisticsCalculator';

// Import classes for re-exporting static methods
import { ForecastMetricsCalculator } from './MetricsCalculator';
import { ModelValidator } from './ModelValidator';
import { ForecastExportEngine } from './ExportEngine';
import { ForecastStatisticsCalculator } from './StatisticsCalculator';
import type { ForecastData, ExportData, ForecastInterval } from './types';

// Re-export commonly used functions for convenience
export const calculateAccuracyMetrics = ForecastMetricsCalculator.calculateAccuracyMetrics.bind(ForecastMetricsCalculator);
export const calculateMAPE = ForecastMetricsCalculator.calculateMAPE.bind(ForecastMetricsCalculator);
export const calculateRMSE = ForecastMetricsCalculator.calculateRMSE.bind(ForecastMetricsCalculator);
export const calculateMAE = ForecastMetricsCalculator.calculateMAE.bind(ForecastMetricsCalculator);
export const calculateR2 = ForecastMetricsCalculator.calculateR2.bind(ForecastMetricsCalculator);
export const calculateNRMSE = ForecastMetricsCalculator.calculateNRMSE.bind(ForecastMetricsCalculator);
export const calculateSkillScore = ForecastMetricsCalculator.calculateSkillScore.bind(ForecastMetricsCalculator);
export const calculateConfidenceBounds = ForecastMetricsCalculator.calculateConfidenceBounds.bind(ForecastMetricsCalculator);
export const validateMetrics = ForecastMetricsCalculator.validateMetrics.bind(ForecastMetricsCalculator);

export const normalizeModelType = ModelValidator.normalizeModelType.bind(ModelValidator);
export const validateModelType = ModelValidator.validateModelType.bind(ModelValidator);
export const isValidModelType = ModelValidator.isValidModelType.bind(ModelValidator);
export const getSupportedModelTypes = ModelValidator.getSupportedModelTypes.bind(ModelValidator);
export const getCanonicalModelTypes = ModelValidator.getCanonicalModelTypes.bind(ModelValidator);
export const getModelCapabilities = ModelValidator.getModelCapabilities.bind(ModelValidator);
export const requiresWeatherData = ModelValidator.requiresWeatherData.bind(ModelValidator);
export const requiresHistoricalData = ModelValidator.requiresHistoricalData.bind(ModelValidator);
export const supportsConfidenceBounds = ModelValidator.supportsConfidenceBounds.bind(ModelValidator);
export const supportsRealTime = ModelValidator.supportsRealTime.bind(ModelValidator);
export const getRecommendedModels = ModelValidator.getRecommendedModels.bind(ModelValidator);
export const getValidationErrorMessage = ModelValidator.getValidationErrorMessage.bind(ModelValidator);
export const safeNormalizeModelType = ModelValidator.safeNormalizeModelType.bind(ModelValidator);

export const exportForecastData = ForecastExportEngine.exportData.bind(ForecastExportEngine);
export const generateExportFilename = ForecastExportEngine.generateFilename.bind(ForecastExportEngine);
export const getExportMimeType = ForecastExportEngine.getMimeType.bind(ForecastExportEngine);

export const calculateForecastStatistics = ForecastStatisticsCalculator.calculateForecastStatistics.bind(ForecastStatisticsCalculator);
export const calculateQualityDistribution = ForecastStatisticsCalculator.calculateQualityDistribution.bind(ForecastStatisticsCalculator);
export const calculateTrendAnalysis = ForecastStatisticsCalculator.calculateTrendAnalysis.bind(ForecastStatisticsCalculator);

/**
 * Convenience function to create a complete forecast analysis
 * Combines metrics, statistics, and validation in one call
 */
export function analyzeForecastData(data: ForecastData[]) {
    return {
        metrics: ForecastMetricsCalculator.calculateAccuracyMetrics(data),
        statistics: ForecastStatisticsCalculator.calculateForecastStatistics(data),
        qualityDistribution: ForecastStatisticsCalculator.calculateQualityDistribution(data),
        trendAnalysis: ForecastStatisticsCalculator.calculateTrendAnalysis(data)
    };
}

/**
 * Convenience function for complete export data preparation
 */
export function prepareExportData(
    forecast: ForecastData[],
    locationId: string,
    locationName: string,
    interval: ForecastInterval,
    startDate?: string,
    endDate?: string
): ExportData {
    const metrics = ForecastMetricsCalculator.calculateAccuracyMetrics(forecast);

    return {
        metadata: {
            locationId,
            locationName,
            interval,
            startDate: startDate || forecast[0]?.timestamp || new Date().toISOString(),
            endDate: endDate || forecast[forecast.length - 1]?.timestamp || new Date().toISOString(),
            generatedAt: new Date().toISOString(),
            accuracy: metrics
        },
        forecast,
        weather: [] // Will be populated with weather data if available
    };
}