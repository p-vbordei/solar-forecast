/**
 * Centralized forecast statistics calculator
 * Eliminates duplicated statistics logic across services
 */

import type { ForecastData, AccuracyMetrics, ModelType, ForecastStatistics } from './types';

export class ForecastStatisticsCalculator {
    /**
     * Calculate comprehensive forecast statistics
     * Replaces duplicated statistics calculations across all services
     */
    static calculateForecastStatistics(
        data: ForecastData[],
        modelPerformanceData?: { modelType: ModelType; accuracy: number; confidence: number }[]
    ): ForecastStatistics {
        if (!data || data.length === 0) {
            return this.getEmptyStatistics();
        }

        // Filter valid forecast points
        const validForecasts = data.filter(point =>
            point.forecast != null &&
            !isNaN(point.forecast)
        );

        if (validForecasts.length === 0) {
            return this.getEmptyStatistics();
        }

        // Calculate time range
        // Performance: Find min/max timestamps in single pass
        let minTimestamp = Number.MAX_SAFE_INTEGER;
        let maxTimestamp = Number.MIN_SAFE_INTEGER;
        for (const forecast of validForecasts) {
            const timestamp = new Date(forecast.timestamp).getTime();
            if (timestamp < minTimestamp) minTimestamp = timestamp;
            if (timestamp > maxTimestamp) maxTimestamp = timestamp;
        }
        const startDate = new Date(minTimestamp);
        const endDate = new Date(maxTimestamp);
        const daysSpanned = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate average accuracy from actual vs forecast comparison
        const averageAccuracy = this.calculateAverageAccuracy(validForecasts);

        // Calculate average confidence
        const averageConfidence = this.calculateAverageConfidence(validForecasts);

        // Process model performance data
        const modelPerformance = this.calculateModelPerformance(modelPerformanceData);

        return {
            totalForecasts: validForecasts.length,
            averageAccuracy,
            averageConfidence,
            modelPerformance,
            timeRangeStats: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                daysSpanned
            }
        };
    }

    /**
     * Calculate average accuracy from forecast vs actual data
     */
    private static calculateAverageAccuracy(data: ForecastData[]): number {
        const validComparisons = data.filter(point =>
            point.forecast != null &&
            point.actual != null &&
            !isNaN(point.forecast) &&
            !isNaN(point.actual!) &&
            point.actual !== 0
        );

        if (validComparisons.length === 0) return 0;

        // Calculate MAPE-based accuracy for each point
        const accuracies = validComparisons.map(point => {
            const percentageError = Math.abs((point.actual! - point.forecast) / point.actual!) * 100;
            return Math.max(0, 100 - percentageError);
        });

        return Number((accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length).toFixed(2));
    }

    /**
     * Calculate average confidence from forecast data
     */
    private static calculateAverageConfidence(data: ForecastData[]): number {
        // Performance: Single pass for confidence extraction
        const confidenceValues: number[] = [];
        for (const point of data) {
            const conf = point.confidence;
            if (conf != null && !isNaN(conf)) {
                confidenceValues.push(conf * 100); // Convert to percentage
            }
        }

        if (confidenceValues.length === 0) return 85; // Default confidence

        return Number((confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length).toFixed(2));
    }

    /**
     * Process and aggregate model performance data
     */
    private static calculateModelPerformance(
        modelData?: { modelType: ModelType; accuracy: number; confidence: number }[]
    ): Record<ModelType, { count: number; avgAccuracy: number; avgConfidence: number }> {
        const defaultPerformance: Record<ModelType, { count: number; avgAccuracy: number; avgConfidence: number }> = {
            'ML_ENSEMBLE': { count: 0, avgAccuracy: 0, avgConfidence: 0 },
            'PHYSICS': { count: 0, avgAccuracy: 0, avgConfidence: 0 },
            'HYBRID': { count: 0, avgAccuracy: 0, avgConfidence: 0 },
            'CATBOOST': { count: 0, avgAccuracy: 0, avgConfidence: 0 },
            'XGBOOST': { count: 0, avgAccuracy: 0, avgConfidence: 0 },
            'LSTM': { count: 0, avgAccuracy: 0, avgConfidence: 0 },
            'TRANSFORMER': { count: 0, avgAccuracy: 0, avgConfidence: 0 },
            'STATISTICAL': { count: 0, avgAccuracy: 0, avgConfidence: 0 }
        };

        if (!modelData || modelData.length === 0) {
            return defaultPerformance;
        }

        // Group by model type
        const modelGroups = modelData.reduce((groups, item) => {
            if (!groups[item.modelType]) {
                groups[item.modelType] = [];
            }
            groups[item.modelType].push(item);
            return groups;
        }, {} as Record<ModelType, typeof modelData>);

        // Calculate averages for each model type
        Object.entries(modelGroups).forEach(([modelType, items]) => {
            const avgAccuracy = items.reduce((sum, item) => sum + item.accuracy, 0) / items.length;
            const avgConfidence = items.reduce((sum, item) => sum + item.confidence, 0) / items.length;

            defaultPerformance[modelType as ModelType] = {
                count: items.length,
                avgAccuracy: Number(avgAccuracy.toFixed(2)),
                avgConfidence: Number(avgConfidence.toFixed(2))
            };
        });

        return defaultPerformance;
    }

    /**
     * Calculate forecast quality distribution
     */
    static calculateQualityDistribution(data: ForecastData[]): {
        excellent: number;  // >90% accuracy
        good: number;       // 70-90% accuracy
        fair: number;       // 50-70% accuracy
        poor: number;       // <50% accuracy
    } {
        const validPoints = data.filter(point =>
            point.forecast != null &&
            point.actual != null &&
            !isNaN(point.forecast) &&
            !isNaN(point.actual!) &&
            point.actual !== 0
        );

        if (validPoints.length === 0) {
            return { excellent: 0, good: 0, fair: 0, poor: 0 };
        }

        const qualityBuckets = { excellent: 0, good: 0, fair: 0, poor: 0 };

        validPoints.forEach(point => {
            const percentageError = Math.abs((point.actual! - point.forecast) / point.actual!) * 100;
            const accuracy = Math.max(0, 100 - percentageError);

            if (accuracy >= 90) qualityBuckets.excellent++;
            else if (accuracy >= 70) qualityBuckets.good++;
            else if (accuracy >= 50) qualityBuckets.fair++;
            else qualityBuckets.poor++;
        });

        // Convert to percentages
        const total = validPoints.length;
        return {
            excellent: Number(((qualityBuckets.excellent / total) * 100).toFixed(1)),
            good: Number(((qualityBuckets.good / total) * 100).toFixed(1)),
            fair: Number(((qualityBuckets.fair / total) * 100).toFixed(1)),
            poor: Number(((qualityBuckets.poor / total) * 100).toFixed(1))
        };
    }

    /**
     * Calculate forecast trend analysis
     */
    static calculateTrendAnalysis(data: ForecastData[]): {
        trend: 'increasing' | 'decreasing' | 'stable';
        slope: number;
        variance: number;
        seasonality: 'detected' | 'not_detected';
    } {
        // Performance: Filter and sort in optimized way
        const validForecasts: ForecastData[] = [];
        for (const point of data) {
            if (point.forecast != null && !isNaN(point.forecast)) {
                validForecasts.push(point);
            }
        }
        // Sort if needed
        if (validForecasts.length > 0) {
            validForecasts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        }

        if (validForecasts.length < 3) {
            return {
                trend: 'stable',
                slope: 0,
                variance: 0,
                seasonality: 'not_detected'
            };
        }

        // Simple linear regression for trend
        const n = validForecasts.length;
        // Performance: Create arrays efficiently
        const x: number[] = [];
        const y: number[] = [];
        for (let i = 0; i < n; i++) {
            x.push(i);
            y.push(validForecasts[i].forecast);
        }

        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

        // Determine trend
        let trend: 'increasing' | 'decreasing' | 'stable';
        if (Math.abs(slope) < 0.01) trend = 'stable';
        else if (slope > 0) trend = 'increasing';
        else trend = 'decreasing';

        // Calculate variance
        const mean = sumY / n;
        const variance = y.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;

        // Simple seasonality detection (look for recurring patterns)
        const seasonality = this.detectSeasonality(validForecasts) ? 'detected' : 'not_detected';

        return {
            trend,
            slope: Number(slope.toFixed(6)),
            variance: Number(variance.toFixed(4)),
            seasonality
        };
    }

    /**
     * Simple seasonality detection
     */
    private static detectSeasonality(data: ForecastData[]): boolean {
        if (data.length < 48) return false; // Need at least 2 days of hourly data

        // Check for daily patterns (24-hour cycles)
        const hourlyAverages = new Array(24).fill(0);
        const hourlyCounts = new Array(24).fill(0);

        data.forEach(point => {
            const hour = new Date(point.timestamp).getHours();
            hourlyAverages[hour] += point.forecast;
            hourlyCounts[hour]++;
        });

        // Calculate average for each hour
        for (let i = 0; i < 24; i++) {
            if (hourlyCounts[i] > 0) {
                hourlyAverages[i] = hourlyAverages[i] / hourlyCounts[i];
            }
        }

        // Check if there's significant variation between hours (indicating daily pattern)
        const mean = hourlyAverages.reduce((sum, val) => sum + val, 0) / 24;
        const variance = hourlyAverages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / 24;
        const coefficient = variance > 0 ? Math.sqrt(variance) / mean : 0;

        return coefficient > 0.2; // Arbitrary threshold for seasonality
    }

    /**
     * Get empty statistics for edge cases
     */
    private static getEmptyStatistics(): ForecastStatistics {
        return {
            totalForecasts: 0,
            averageAccuracy: 0,
            averageConfidence: 0,
            modelPerformance: {
                'ML_ENSEMBLE': { count: 0, avgAccuracy: 0, avgConfidence: 0 },
                'PHYSICS': { count: 0, avgAccuracy: 0, avgConfidence: 0 },
                'HYBRID': { count: 0, avgAccuracy: 0, avgConfidence: 0 },
                'CATBOOST': { count: 0, avgAccuracy: 0, avgConfidence: 0 },
                'XGBOOST': { count: 0, avgAccuracy: 0, avgConfidence: 0 },
                'LSTM': { count: 0, avgAccuracy: 0, avgConfidence: 0 },
                'TRANSFORMER': { count: 0, avgAccuracy: 0, avgConfidence: 0 },
                'STATISTICAL': { count: 0, avgAccuracy: 0, avgConfidence: 0 }
            },
            timeRangeStats: {
                startDate: new Date().toISOString(),
                endDate: new Date().toISOString(),
                daysSpanned: 0
            }
        };
    }
}