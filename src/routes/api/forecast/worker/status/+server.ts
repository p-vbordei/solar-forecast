import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * GET /api/forecast/worker/status - Check Python worker status
 * Used by UI to verify Python worker connectivity
 */
export const GET: RequestHandler = async ({ url }) => {
    try {
        const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';

        // Check Python worker health
        const healthResponse = await fetch(`${pythonWorkerUrl}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!healthResponse.ok) {
            return json({
                success: false,
                status: 'disconnected',
                error: `Python worker returned ${healthResponse.status}`
            }, { status: 503 });
        }

        const healthData = await healthResponse.json();

        return json({
            success: true,
            status: 'connected',
            worker_url: pythonWorkerUrl,
            worker_health: healthData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Python worker status check failed:', error);
        return json({
            success: false,
            status: 'error',
            error: error.message
        }, { status: 500 });
    }
};