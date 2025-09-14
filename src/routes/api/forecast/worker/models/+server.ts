import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * GET /api/forecast/worker/models - Get available models from Python worker
 * Used by UI to populate model selection dropdown
 */
export const GET: RequestHandler = async () => {
    try {
        const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';

        // Get available models from Python worker
        const modelsResponse = await fetch(`${pythonWorkerUrl}/api/forecast/models`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!modelsResponse.ok) {
            // Fallback to default models if Python worker is not available
            return json({
                success: true,
                models: [
                    {
                        id: 'catboost',
                        name: 'CatBoost',
                        description: 'Gradient boosting with quantile regression',
                        status: 'available',
                        confidence: 'high',
                        best_for: 'General purpose forecasting'
                    }
                ],
                source: 'fallback',
                timestamp: new Date().toISOString()
            });
        }

        const modelsData = await modelsResponse.json();

        return json({
            success: true,
            models: modelsData.models || modelsData,
            source: 'python_worker',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Model retrieval failed:', error);

        // Return fallback models
        return json({
            success: true,
            models: [
                {
                    id: 'catboost',
                    name: 'CatBoost',
                    description: 'Primary forecasting model with quantile regression',
                    status: 'available',
                    confidence: 'high',
                    best_for: 'Solar power forecasting with weather integration'
                },
                {
                    id: 'lstm',
                    name: 'LSTM Neural Network',
                    description: 'Time-series neural network (mapped to CatBoost)',
                    status: 'available',
                    confidence: 'medium',
                    best_for: 'Sequential pattern recognition'
                },
                {
                    id: 'xgboost',
                    name: 'XGBoost',
                    description: 'Extreme gradient boosting (mapped to CatBoost)',
                    status: 'available',
                    confidence: 'high',
                    best_for: 'Structured data prediction'
                }
            ],
            source: 'fallback',
            note: 'Python worker unavailable, showing default models',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * POST /api/forecast/worker/models/test - Test a specific model
 * Used by UI to validate model performance before using
 */
export const POST: RequestHandler = async ({ request }) => {
    try {
        const requestData = await request.json();
        const { model_type, location_id } = requestData;

        if (!model_type) {
            return json({
                success: false,
                error: 'model_type is required'
            }, { status: 400 });
        }

        if (!location_id) {
            return json({
                success: false,
                error: 'location_id is required'
            }, { status: 400 });
        }

        const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';

        // Test model with a small forecast request
        const testResponse = await fetch(`${pythonWorkerUrl}/api/forecast/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location_id: parseInt(location_id.toString()),
                forecast_hours: 24,  // Short test forecast
                model_type,
                use_weather: true
            })
        });

        if (!testResponse.ok) {
            const errorData = await testResponse.json().catch(() => ({}));
            return json({
                success: false,
                model_type,
                status: 'failed',
                error: errorData.detail || `Model test failed with status ${testResponse.status}`
            }, { status: testResponse.status });
        }

        const testResult = await testResponse.json();

        return json({
            success: true,
            model_type,
            status: 'working',
            test_result: {
                forecast_points: Array.isArray(testResult.forecasts) ? testResult.forecasts.length : 0,
                confidence_range: testResult.confidence_level || 'unknown',
                processing_time: testResult.processing_time || 'unknown'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Model test failed:', error);
        return json({
            success: false,
            model_type: request.json().then(d => d.model_type).catch(() => 'unknown'),
            status: 'error',
            error: error.message
        }, { status: 500 });
    }
};