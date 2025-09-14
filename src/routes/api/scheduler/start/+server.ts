import { json, type RequestHandler } from '@sveltejs/kit';
import { schedulerService } from '$lib/server/services/scheduler.service';

/**
 * POST /api/scheduler/start
 * Start the scheduler service
 */
export const POST: RequestHandler = async () => {
  try {
    await schedulerService.start();
    const status = schedulerService.getStatus();

    return json({
      success: true,
      message: 'Scheduler started successfully',
      status
    });
  } catch (error: any) {
    console.error('Error starting scheduler:', error);
    return json(
      { success: false, error: error.message || 'Failed to start scheduler' },
      { status: 500 }
    );
  }
};

/**
 * GET /api/scheduler/start
 * Get scheduler status
 */
export const GET: RequestHandler = async () => {
  try {
    const status = schedulerService.getStatus();

    return json({
      success: true,
      status
    });
  } catch (error: any) {
    console.error('Error getting scheduler status:', error);
    return json(
      { success: false, error: error.message || 'Failed to get scheduler status' },
      { status: 500 }
    );
  }
};