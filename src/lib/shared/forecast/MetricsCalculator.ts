/**
 * Top-class forecast metrics calculator
 * Single source of truth for ALL accuracy calculations
 * Eliminates duplication across Python Worker, Features Service, and Legacy Service
 */

import type { ForecastData, AccuracyMetrics, ConfidenceBounds } from './types';

export class ForecastMetricsCalculator {
    /**
     * Calculate comprehensive accuracy metrics from forecast vs actual data
     * Replaces duplicated logic in all three services
     */
    static calculateAccuracyMetrics(data: ForecastData[]): AccuracyMetrics {
        if (!data || data.length === 0) {
            return this.getDefaultMetrics(0);
        }

        // Filter data points with both forecast and actual values
        const validPoints = data.filter(point =>
            point.forecast != null &&
            point.actual != null &&
            !isNaN(point.forecast) &&
            !isNaN(point.actual) &&
            point.actual !== 0 // Avoid division by zero
        );

        if (validPoints.length === 0) {
            return this.getDefaultMetrics(data.length);
        }

        const forecasts = validPoints.map(p => p.forecast);
        const actuals = validPoints.map(p => p.actual!);

        // Core accuracy calculations
        const mape = this.calculateMAPE(actuals, forecasts);
        const rmse = this.calculateRMSE(actuals, forecasts);
        const mae = this.calculateMAE(actuals, forecasts);
        const r2 = this.calculateR2(actuals, forecasts);
        const nrmse = this.calculateNRMSE(actuals, forecasts);
        const skillScore = this.calculateSkillScore(actuals, forecasts);

        // Overall accuracy (100 - MAPE, clamped to 0-100)
        const accuracy = Math.max(0, Math.min(100, 100 - mape));

        // Confidence score based on accuracy and consistency
        const confidence_score = this.calculateOverallConfidence(accuracy, r2, validPoints.length);

        return {
            accuracy: Number(accuracy.toFixed(2)),
            mape: Number(mape.toFixed(2)),
            rmse: Number(rmse.toFixed(4)),
            mae: Number(mae.toFixed(4)),
            r2: Number(r2.toFixed(4)),
            nrmse: Number(nrmse.toFixed(4)),
            skill_score: Number(skillScore.toFixed(4)),
            sample_count: validPoints.length,
            confidence_score: Number(confidence_score.toFixed(3))
        };
    }

    /**
     * Mean Absolute Percentage Error (MAPE)
     * Primary accuracy metric for forecast evaluation
     */
    static calculateMAPE(actual: number[], forecast: number[]): number {
        if (actual.length !== forecast.length || actual.length === 0) return 100;

        let sumAPE = 0;
        let validPoints = 0;

        for (let i = 0; i < actual.length; i++) {
            if (actual[i] !== 0) { // Avoid division by zero
                sumAPE += Math.abs((actual[i] - forecast[i]) / actual[i]);
                validPoints++;
            }
        }

        return validPoints > 0 ? (sumAPE / validPoints) * 100 : 100;
    }

    /**
     * Root Mean Square Error (RMSE)
     * Measures forecast precision
     */
    static calculateRMSE(actual: number[], forecast: number[]): number {
        if (actual.length !== forecast.length || actual.length === 0) return 0;

        const sumSquaredError = actual.reduce((sum, a, i) =>
            sum + Math.pow(a - forecast[i], 2), 0);

        return Math.sqrt(sumSquaredError / actual.length);
    }

    /**
     * Mean Absolute Error (MAE)
     * Average absolute difference between forecast and actual
     */
    static calculateMAE(actual: number[], forecast: number[]): number {
        if (actual.length !== forecast.length || actual.length === 0) return 0;

        const sumAbsoluteError = actual.reduce((sum, a, i) =>
            sum + Math.abs(a - forecast[i]), 0);

        return sumAbsoluteError / actual.length;
    }

    /**
     * R-squared (coefficient of determination)
     * Measures how well forecast explains actual variance
     */
    static calculateR2(actual: number[], forecast: number[]): number {
        if (actual.length !== forecast.length || actual.length === 0) return 0;

        const actualMean = actual.reduce((sum, val) => sum + val, 0) / actual.length;

        const totalSumSquares = actual.reduce((sum, val) =>
            sum + Math.pow(val - actualMean, 2), 0);

        const residualSumSquares = actual.reduce((sum, val, i) =>
            sum + Math.pow(val - forecast[i], 2), 0);

        if (totalSumSquares === 0) return 0;

        return Math.max(0, 1 - (residualSumSquares / totalSumSquares));
    }

    /**
     * Normalized Root Mean Square Error (NRMSE)
     * RMSE normalized by the range of actual values
     */
    static calculateNRMSE(actual: number[], forecast: number[]): number {
        const rmse = this.calculateRMSE(actual, forecast);
        const actualRange = Math.max(...actual) - Math.min(...actual);

        return actualRange > 0 ? rmse / actualRange : 0;
    }

    /**
     * Forecast Skill Score
     * Compares forecast performance to persistence (naive) forecast
     */
    static calculateSkillScore(actual: number[], forecast: number[]): number {
        if (actual.length < 2) return 0;

        // Create persistence forecast (previous value)
        const persistenceForecast = [actual[0], ...actual.slice(0, -1)];

        const forecastMSE = this.calculateMSE(actual, forecast);
        const persistenceMSE = this.calculateMSE(actual, persistenceForecast);

        if (persistenceMSE === 0) return 0;

        return Math.max(0, 1 - (forecastMSE / persistenceMSE));
    }

    /**
     * Mean Square Error helper function
     */
    private static calculateMSE(actual: number[], forecast: number[]): number {
        if (actual.length !== forecast.length || actual.length === 0) return 0;

        const sumSquaredError = actual.reduce((sum, a, i) =>
            sum + Math.pow(a - forecast[i], 2), 0);

        return sumSquaredError / actual.length;
    }

    /**
     * Calculate overall confidence score from multiple factors
     */
    static calculateOverallConfidence(accuracy: number, r2: number, sampleCount: number): number {
        // Base confidence from accuracy (0-100 scale normalized to 0-1)
        const accuracyConfidence = accuracy / 100;

        // R² confidence (already 0-1)
        const r2Confidence = r2;

        // Sample size confidence (more samples = higher confidence)
        const sampleConfidence = Math.min(1, sampleCount / 100);

        // Weighted combination
        const overallConfidence = (
            accuracyConfidence * 0.5 +
            r2Confidence * 0.3 +
            sampleConfidence * 0.2
        );

        return Math.max(0, Math.min(1, overallConfidence));
    }

    /**
     * Calculate confidence bounds from forecast data
     */
    static calculateConfidenceBounds(data: ForecastData[]): ConfidenceBounds[] {
        return data.map(point => {
            const confidence = this.calculatePointConfidence(
                point.forecast,
                point.confidence_lower,
                point.confidence_upper
            );

            return {
                value: point.forecast,
                lower: point.confidence_lower ?? undefined,
                upper: point.confidence_upper ?? undefined,
                q25: point.confidence_q25 ?? undefined,
                q75: point.confidence_q75 ?? undefined
            };
        });
    }

    /**
     * Calculate confidence for a single forecast point
     */
    static calculatePointConfidence(
        value: number,
        lower?: number | null,
        upper?: number | null
    ): number {
        if (lower == null || upper == null || value === 0) {
            return 0.85; // Default confidence
        }

        // Confidence based on relative width of confidence interval
        const intervalWidth = Math.abs(upper - lower);
        const relativeWidth = intervalWidth / Math.abs(value);

        // Lower relative width = higher confidence
        return Math.max(0.1, Math.min(1.0, 1 - relativeWidth));
    }

    /**
     * Default metrics for edge cases
     */
    private static getDefaultMetrics(sampleCount: number): AccuracyMetrics {
        return {
            accuracy: 0,
            mape: 100,
            rmse: 0,
            mae: 0,
            r2: 0,
            nrmse: 0,
            skill_score: 0,
            sample_count: sampleCount,
            confidence_score: 0
        };
    }

    /**
     * Validate metrics for reasonableness
     */
    static validateMetrics(metrics: AccuracyMetrics): boolean {
        return (
            metrics.accuracy >= 0 && metrics.accuracy <= 100 &&
            metrics.mape >= 0 &&
            metrics.rmse >= 0 &&
            metrics.mae >= 0 &&
            metrics.r2 >= 0 && metrics.r2 <= 1 &&
            metrics.confidence_score >= 0 && metrics.confidence_score <= 1 &&
            metrics.sample_count >= 0
        );
    }
}