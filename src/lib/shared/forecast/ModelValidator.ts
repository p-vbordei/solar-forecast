/**
 * Centralized model type validation and normalization
 * Eliminates scattered validation logic across services
 */

import type { ModelType, ModelValidationResult } from './types';

export class ModelValidator {
    /**
     * Cache for normalized model types (performance optimization)
     */
    private static normalizationCache = new Map<string, ModelType>();

    /**
     * Valid model types mapping
     * Single source of truth for all model type validation
     */
    private static readonly MODEL_TYPE_MAPPING: Record<string, ModelType> = {
        // ML Ensemble Models
        'ML_ENSEMBLE': 'ML_ENSEMBLE',
        'ENSEMBLE': 'ML_ENSEMBLE',
        'ml_ensemble': 'ML_ENSEMBLE',
        'ensemble': 'ML_ENSEMBLE',

        // Physics Models
        'PHYSICS': 'PHYSICS',
        'physics': 'PHYSICS',
        'PVLIB': 'PHYSICS',
        'pvlib': 'PHYSICS',
        'PHYSICS_ONLY': 'PHYSICS',

        // Hybrid Models
        'HYBRID': 'HYBRID',
        'hybrid': 'HYBRID',
        'ML_PHYSICS': 'HYBRID',
        'PHYSICS_ML': 'HYBRID',

        // Specific ML Models
        'CATBOOST': 'CATBOOST',
        'catboost': 'CATBOOST',
        'CatBoost': 'CATBOOST',
        'cat_boost': 'CATBOOST',

        'XGBOOST': 'XGBOOST',
        'xgboost': 'XGBOOST',
        'XGBoost': 'XGBOOST',
        'xg_boost': 'XGBOOST',

        'LSTM': 'LSTM',
        'lstm': 'LSTM',
        'RNN': 'LSTM',
        'rnn': 'LSTM',

        'TRANSFORMER': 'TRANSFORMER',
        'transformer': 'TRANSFORMER',
        'BERT': 'TRANSFORMER',
        'GPT': 'TRANSFORMER',

        // Statistical Models
        'STATISTICAL': 'STATISTICAL',
        'statistical': 'STATISTICAL',
        'ARIMA': 'STATISTICAL',
        'SARIMA': 'STATISTICAL',
        'ETS': 'STATISTICAL',
        'EXPONENTIAL_SMOOTHING': 'STATISTICAL'
    };

    /**
     * Model type capabilities and characteristics
     */
    private static readonly MODEL_CAPABILITIES: Record<ModelType, {
        requiresWeatherData: boolean;
        requiresHistoricalData: boolean;
        supportsConfidenceBounds: boolean;
        supportsRealTime: boolean;
        computationalComplexity: 'low' | 'medium' | 'high';
        accuracy: 'basic' | 'good' | 'excellent';
        description: string;
    }> = {
        'PHYSICS': {
            requiresWeatherData: true,
            requiresHistoricalData: false,
            supportsConfidenceBounds: false,
            supportsRealTime: true,
            computationalComplexity: 'medium',
            accuracy: 'good',
            description: 'Physics-based solar modeling using PVLIB'
        },
        'ML_ENSEMBLE': {
            requiresWeatherData: true,
            requiresHistoricalData: true,
            supportsConfidenceBounds: true,
            supportsRealTime: false,
            computationalComplexity: 'high',
            accuracy: 'excellent',
            description: 'Ensemble of multiple ML models with uncertainty quantification'
        },
        'HYBRID': {
            requiresWeatherData: true,
            requiresHistoricalData: true,
            supportsConfidenceBounds: true,
            supportsRealTime: true,
            computationalComplexity: 'high',
            accuracy: 'excellent',
            description: 'Combination of physics-based and ML models'
        },
        'CATBOOST': {
            requiresWeatherData: true,
            requiresHistoricalData: true,
            supportsConfidenceBounds: true,
            supportsRealTime: false,
            computationalComplexity: 'medium',
            accuracy: 'excellent',
            description: 'CatBoost gradient boosting model'
        },
        'XGBOOST': {
            requiresWeatherData: true,
            requiresHistoricalData: true,
            supportsConfidenceBounds: true,
            supportsRealTime: false,
            computationalComplexity: 'medium',
            accuracy: 'excellent',
            description: 'XGBoost gradient boosting model'
        },
        'LSTM': {
            requiresWeatherData: true,
            requiresHistoricalData: true,
            supportsConfidenceBounds: false,
            supportsRealTime: false,
            computationalComplexity: 'high',
            accuracy: 'good',
            description: 'Long Short-Term Memory neural network'
        },
        'TRANSFORMER': {
            requiresWeatherData: true,
            requiresHistoricalData: true,
            supportsConfidenceBounds: false,
            supportsRealTime: false,
            computationalComplexity: 'high',
            accuracy: 'excellent',
            description: 'Transformer-based neural network'
        },
        'STATISTICAL': {
            requiresWeatherData: false,
            requiresHistoricalData: true,
            supportsConfidenceBounds: true,
            supportsRealTime: true,
            computationalComplexity: 'low',
            accuracy: 'basic',
            description: 'Statistical time series models (ARIMA, ETS)'
        }
    };

    /**
     * Normalize model type string to standard ModelType
     * Replaces scattered normalization logic in all services
     */
    static normalizeModelType(modelType: string | undefined | null): ModelType {
        if (!modelType || typeof modelType !== 'string') {
            return 'ML_ENSEMBLE'; // Default model type
        }

        const trimmed = modelType.trim();

        // Performance: Check cache first
        const cached = this.normalizationCache.get(trimmed);
        if (cached) {
            return cached;
        }

        const normalized = this.MODEL_TYPE_MAPPING[trimmed] || 'ML_ENSEMBLE';

        // Cache the result (limit cache size for memory efficiency)
        if (this.normalizationCache.size < 1000) {
            this.normalizationCache.set(trimmed, normalized);
        }

        return normalized;
    }

    /**
     * Comprehensive model type validation
     * Returns detailed validation result with errors
     */
    static validateModelType(modelType: string | undefined | null): ModelValidationResult {
        const errors: string[] = [];

        // Check if model type is provided
        if (!modelType || typeof modelType !== 'string') {
            errors.push('Model type is required and must be a string');
            return {
                isValid: false,
                normalizedType: 'ML_ENSEMBLE',
                errors
            };
        }

        const trimmed = modelType.trim();

        // Check if empty after trimming
        if (!trimmed) {
            errors.push('Model type cannot be empty');
            return {
                isValid: false,
                normalizedType: 'ML_ENSEMBLE',
                errors
            };
        }

        // Check if model type is supported
        const normalizedType = this.MODEL_TYPE_MAPPING[trimmed];
        if (!normalizedType) {
            errors.push(`Unsupported model type: '${trimmed}'. Supported types: ${this.getSupportedModelTypes().join(', ')}`);
            return {
                isValid: false,
                normalizedType: 'ML_ENSEMBLE',
                errors
            };
        }

        return {
            isValid: true,
            normalizedType,
            errors: []
        };
    }

    /**
     * Check if model type is valid (simple boolean check)
     */
    static isValidModelType(modelType: string | undefined | null): boolean {
        return this.validateModelType(modelType).isValid;
    }

    /**
     * Get all supported model types
     */
    static getSupportedModelTypes(): string[] {
        return Object.keys(this.MODEL_TYPE_MAPPING);
    }

    /**
     * Get canonical model types (unique values)
     */
    static getCanonicalModelTypes(): ModelType[] {
        return Object.keys(this.MODEL_CAPABILITIES) as ModelType[];
    }

    /**
     * Get model capabilities
     */
    static getModelCapabilities(modelType: ModelType) {
        return this.MODEL_CAPABILITIES[modelType];
    }

    /**
     * Check if model requires weather data
     */
    static requiresWeatherData(modelType: ModelType): boolean {
        return this.MODEL_CAPABILITIES[modelType]?.requiresWeatherData ?? true;
    }

    /**
     * Check if model requires historical data
     */
    static requiresHistoricalData(modelType: ModelType): boolean {
        return this.MODEL_CAPABILITIES[modelType]?.requiresHistoricalData ?? true;
    }

    /**
     * Check if model supports confidence bounds
     */
    static supportsConfidenceBounds(modelType: ModelType): boolean {
        return this.MODEL_CAPABILITIES[modelType]?.supportsConfidenceBounds ?? false;
    }

    /**
     * Check if model supports real-time forecasting
     */
    static supportsRealTime(modelType: ModelType): boolean {
        return this.MODEL_CAPABILITIES[modelType]?.supportsRealTime ?? false;
    }

    /**
     * Get recommended model types based on requirements
     */
    static getRecommendedModels(requirements: {
        needsRealTime?: boolean;
        needsConfidenceBounds?: boolean;
        hasHistoricalData?: boolean;
        hasWeatherData?: boolean;
        preferredAccuracy?: 'basic' | 'good' | 'excellent';
        maxComplexity?: 'low' | 'medium' | 'high';
    }): ModelType[] {
        return this.getCanonicalModelTypes().filter(modelType => {
            const capabilities = this.MODEL_CAPABILITIES[modelType];

            // Check requirements
            if (requirements.needsRealTime && !capabilities.supportsRealTime) return false;
            if (requirements.needsConfidenceBounds && !capabilities.supportsConfidenceBounds) return false;
            if (!requirements.hasHistoricalData && capabilities.requiresHistoricalData) return false;
            if (!requirements.hasWeatherData && capabilities.requiresWeatherData) return false;

            // Check preferences
            if (requirements.preferredAccuracy) {
                const accuracyOrder = { 'basic': 1, 'good': 2, 'excellent': 3 };
                const requiredLevel = accuracyOrder[requirements.preferredAccuracy];
                const modelLevel = accuracyOrder[capabilities.accuracy];
                if (modelLevel < requiredLevel) return false;
            }

            if (requirements.maxComplexity) {
                const complexityOrder = { 'low': 1, 'medium': 2, 'high': 3 };
                const maxLevel = complexityOrder[requirements.maxComplexity];
                const modelLevel = complexityOrder[capabilities.computationalComplexity];
                if (modelLevel > maxLevel) return false;
            }

            return true;
        });
    }

    /**
     * Generate validation error message for API responses
     */
    static getValidationErrorMessage(modelType: string): string {
        const result = this.validateModelType(modelType);
        if (result.isValid) {
            return '';
        }

        return `Invalid model type: ${result.errors.join(', ')}`;
    }

    /**
     * Get model type with fallback and logging
     */
    static safeNormalizeModelType(
        modelType: string | undefined | null,
        logger?: (message: string) => void
    ): ModelType {
        const result = this.validateModelType(modelType);

        if (!result.isValid && logger) {
            logger(`Model type validation failed: ${result.errors.join(', ')}. Using fallback: ${result.normalizedType}`);
        }

        return result.normalizedType;
    }
}