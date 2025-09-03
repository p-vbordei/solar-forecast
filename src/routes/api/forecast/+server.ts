import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Mock forecast data
const generateMockForecast = (locationId: number, hours: number = 48) => {
    const forecasts = [];
    const now = new Date();
    
    for (let i = 0; i < hours; i++) {
        const time = new Date(now.getTime() + i * 60 * 60 * 1000);
        const hour = time.getHours();
        
        // Generate realistic solar production curve
        let production = 0;
        if (hour >= 6 && hour <= 18) {
            // Daylight hours - bell curve centered at noon
            const peakHour = 12;
            const variance = 6;
            production = 25 * Math.exp(-Math.pow(hour - peakHour, 2) / (2 * variance * variance));
            // Add some randomness
            production = production * (0.9 + Math.random() * 0.2);
        }
        
        forecasts.push({
            time: time.toISOString(),
            locationId,
            powerOutputMW: parseFloat(production.toFixed(2)),
            confidence: 85 + Math.random() * 10,
            temperature: 20 + Math.random() * 10,
            cloudCover: Math.random() * 100,
            irradiance: production > 0 ? 600 + Math.random() * 400 : 0
        });
    }
    
    return forecasts;
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { locationId, horizonHours = 48, modelType = 'ML' } = await request.json();
        
        if (!locationId) {
            return json({
                success: false,
                error: 'Location ID is required'
            }, { status: 400 });
        }
        
        // Simulate API call to Python worker
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // In production, this would call the Python worker API
        // const response = await fetch(`${PYTHON_WORKER_URL}/api/v1/forecast/generate`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ location_id: locationId, horizon_hours: horizonHours, model_type: modelType })
        // });
        
        return json({
            success: true,
            data: {
                taskId,
                status: 'queued',
                locationId,
                estimatedTimeSeconds: 5
            }
        }, { status: 201 });
    } catch (error) {
        console.error('Error generating forecast:', error);
        return json({
            success: false,
            error: 'Failed to generate forecast'
        }, { status: 500 });
    }
};

export const GET: RequestHandler = async ({ url }) => {
    try {
        const locationId = url.searchParams.get('locationId');
        const taskId = url.searchParams.get('taskId');
        const hours = parseInt(url.searchParams.get('hours') || '48');
        
        if (taskId) {
            // Check task status (mock)
            return json({
                success: true,
                data: {
                    taskId,
                    status: 'completed',
                    progress: 100,
                    result: generateMockForecast(1, 48)
                }
            });
        }
        
        if (!locationId) {
            return json({
                success: false,
                error: 'Location ID or Task ID is required'
            }, { status: 400 });
        }
        
        const forecasts = generateMockForecast(parseInt(locationId), hours);
        
        return json({
            success: true,
            data: forecasts,
            metadata: {
                locationId: parseInt(locationId),
                horizonHours: hours,
                generatedAt: new Date().toISOString(),
                modelType: 'ML',
                accuracy: 94.5
            }
        });
    } catch (error) {
        console.error('Error fetching forecast:', error);
        return json({
            success: false,
            error: 'Failed to fetch forecast'
        }, { status: 500 });
    }
};