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

// Re-export commonly used functions for convenience
export const {
    calculateAccuracyMetrics,
    calculateMAPE,
    calculateRMSE,
    calculateMAE,
    calculateR2,
    calculateNRMSE,
    calculateSkillScore,
    calculateConfidenceBounds,
    validateMetrics
} = ForecastMetricsCalculator;

export const {
    normalizeModelType,
    validateModelType,
    isValidModelType,
    getSupportedModelTypes,
    getCanonicalModelTypes,
    getModelCapabilities,
    requiresWeatherData,
    requiresHistoricalData,
    supportsConfidenceBounds,
    supportsRealTime,
    getRecommendedModels,
    getValidationErrorMessage,
    safeNormalizeModelType
} = ModelValidator;

export const {
    exportData: exportForecastData,
    generateFilename: generateExportFilename,
    getMimeType: getExportMimeType
} = ForecastExportEngine;

export const {
    calculateForecastStatistics,
    calculateQualityDistribution,
    calculateTrendAnalysis
} = ForecastStatisticsCalculator;

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