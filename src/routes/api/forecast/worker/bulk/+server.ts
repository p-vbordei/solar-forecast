import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * POST /api/forecast/worker/bulk - Generate forecasts for multiple locations
 * Used by UI for batch processing and scheduled operations
 */
export const POST: RequestHandler = async ({ request }) => {
    try {
        const requestData = await request.json();
        const { location_ids, forecast_hours = 24, model_type = 'catboost' } = requestData;

        if (!Array.isArray(location_ids) || location_ids.length === 0) {
            return json({
                success: false,
                error: 'location_ids array is required'
            }, { status: 400 });
        }

        const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';

        // Call Python worker pipeline endpoint for bulk processing
        const pipelineResponse = await fetch(`${pythonWorkerUrl}/api/pipeline/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location_ids,
                forecast_hours,
                model_type
            })
        });

        if (!pipelineResponse.ok) {
            const errorData = await pipelineResponse.json().catch(() => ({}));
            return json({
                success: false,
                error: errorData.detail || `Python worker returned ${pipelineResponse.status}`
            }, { status: pipelineResponse.status });
        }

        const pipelineResult = await pipelineResponse.json();

        return json({
            success: true,
            task_id: pipelineResult.task_id,
            locations: location_ids,
            forecast_hours,
            model_type,
            status: 'initiated',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Bulk forecast generation failed:', error);
        return json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
};

/**
 * GET /api/forecast/worker/bulk?task_id=xxx - Check bulk operation status
 */
export const GET: RequestHandler = async ({ url }) => {
    try {
        const taskId = url.searchParams.get('task_id');

        if (!taskId) {
            return json({
                success: false,
                error: 'task_id parameter is required'
            }, { status: 400 });
        }

        const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';

        // Check task status
        const statusResponse = await fetch(
            `${pythonWorkerUrl}/api/pipeline/status/${taskId}`
        );

        if (!statusResponse.ok) {
            return json({
                success: false,
                error: `Task status check failed: ${statusResponse.status}`
            }, { status: statusResponse.status });
        }

        const statusData = await statusResponse.json();

        return json({
            success: true,
            task_id: taskId,
            status: statusData.status,
            progress: statusData.progress || null,
            results: statusData.results || null,
            error: statusData.error || null,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Bulk forecast status check failed:', error);
        return json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
};