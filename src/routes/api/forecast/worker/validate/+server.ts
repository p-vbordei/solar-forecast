import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/database';

/**
 * POST /api/forecast/worker/validate - Validate forecast parameters and test connection
 * Used by UI for pre-validation before generating actual forecasts
 */
export const POST: RequestHandler = async ({ request }) => {
    try {
        const requestData = await request.json();
        const { location_id, forecast_hours = 24, model_type = 'catboost' } = requestData;

        // Validate input parameters
        if (!location_id) {
            return json({
                success: false,
                error: 'location_id is required'
            }, { status: 400 });
        }

        if (![24, 48, 72].includes(forecast_hours)) {
            return json({
                success: false,
                error: 'forecast_hours must be 24, 48, or 72'
            }, { status: 400 });
        }

        const validModels = ['catboost', 'lstm', 'xgboost', 'random_forest', 'arima', 'prophet', 'ensemble'];
        if (!validModels.includes(model_type)) {
            return json({
                success: false,
                error: `model_type must be one of: ${validModels.join(', ')}`
            }, { status: 400 });
        }

        // Check if location exists in database
        const location = await db.location.findUnique({
            where: { id: String(location_id) }
        });

        if (!location) {
            return json({
                success: false,
                error: `Location ${location_id} not found`
            }, { status: 404 });
        }

        // Test Python worker connection
        const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';

        try {
            const healthResponse = await fetch(`${pythonWorkerUrl}/health`, {
                method: 'GET',
                timeout: 5000
            });

            if (!healthResponse.ok) {
                return json({
                    success: false,
                    error: 'Python worker is not healthy',
                    validation: {
                        parameters: 'valid',
                        location: 'exists',
                        worker_connection: 'failed'
                    }
                }, { status: 503 });
            }
        } catch (connectionError) {
            return json({
                success: false,
                error: 'Cannot connect to Python worker',
                validation: {
                    parameters: 'valid',
                    location: 'exists',
                    worker_connection: 'failed'
                }
            }, { status: 503 });
        }

        // Validate location has required data
        const recentWeather = await db.weatherData.count({
            where: {
                locationId: String(location_id),
                timestamp: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                }
            }
        });

        const dataQuality = {
            weather_data_points: recentWeather,
            has_recent_weather: recentWeather > 0,
            location_coordinates: {
                latitude: location.latitude,
                longitude: location.longitude
            }
        };

        return json({
            success: true,
            validation: {
                parameters: 'valid',
                location: 'exists',
                worker_connection: 'healthy',
                data_quality: dataQuality
            },
            request_summary: {
                location_id: String(location_id),
                location_name: location.name,
                forecast_hours,
                model_type,
                estimated_points: forecast_hours // One prediction per hour
            },
            recommendations: recentWeather === 0 ? [
                'No recent weather data found. Forecast may use default weather patterns.',
                'Consider updating weather data for better accuracy.'
            ] : [
                'All validation checks passed.',
                'Ready for forecast generation.'
            ]
        });
    } catch (error) {
        console.error('Forecast validation failed:', error);
        return json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
};