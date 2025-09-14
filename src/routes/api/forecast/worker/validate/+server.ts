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

        const validModels = ['ML_ENSEMBLE', 'PHYSICS', 'HYBRID'];
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
        let workerAvailable = false;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

            const healthResponse = await fetch(`${pythonWorkerUrl}/health`, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (healthResponse.ok) {
                workerAvailable = true;
            } else {
                console.warn('Python worker is not healthy, but will use mock data fallback');
            }
        } catch (connectionError) {
            console.warn('Cannot connect to Python worker, will use mock data fallback');
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

        // Check for historical production data (required for CatBoost)
        const historicalProduction = await db.production.count({
            where: {
                locationId: String(location_id),
                timestamp: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
            }
        });

        const dataQuality = {
            weather_data_points: recentWeather,
            has_recent_weather: recentWeather > 0,
            production_data_points: historicalProduction,
            has_historical_production: historicalProduction > 0,
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
                worker_connection: workerAvailable ? 'healthy' : 'unavailable',
                data_quality: dataQuality
            },
            request_summary: {
                location_id: String(location_id),
                location_name: location.name,
                forecast_hours,
                model_type,
                estimated_points: forecast_hours // One prediction per hour
            },
            recommendations: (() => {
                const recommendations = [];

                if (!workerAvailable) {
                    recommendations.push(
                        'Python worker is not available. Mock data will be used for forecasting.',
                        'To get real ML-based forecasts, ensure the Python worker is running.'
                    );
                }

                if (historicalProduction === 0 && model_type === 'ML_ENSEMBLE') {
                    recommendations.push(
                        'WARNING: No historical production data found for this location.',
                        'ML Ensemble model requires historical data to train. Mock data will be used instead.',
                        'To get accurate forecasts, ensure production data is being recorded for this location.'
                    );
                }

                if (recentWeather === 0) {
                    recommendations.push(
                        'No recent weather data found. Forecast may use default weather patterns.',
                        'Consider updating weather data for better accuracy.'
                    );
                }

                if (recommendations.length === 0) {
                    recommendations.push(
                        'All validation checks passed.',
                        'Ready for forecast generation.'
                    );
                }

                return recommendations;
            })()
        });
    } catch (error) {
        console.error('Forecast validation failed:', error);
        return json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
};