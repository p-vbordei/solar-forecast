import { json, type RequestHandler } from '@sveltejs/kit';
import { scheduledReportService } from '$lib/server/services/scheduled-report.service';

/**
 * DELETE /api/reports/scheduled/[id]
 * Delete a scheduled report
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // For now, using hardcoded user ID until auth is implemented
    const userId = 1;

    // TODO: Verify the report belongs to the user before deleting
    // This will be implemented when auth is ready

    // Delete the scheduled report
    await scheduledReportService.deleteScheduledReport(id);

    return json({
      success: true,
      message: 'Scheduled report deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting scheduled report:', error);
    return json(
      { success: false, error: error.message || 'Failed to delete scheduled report' },
      { status: 500 }
    );
  }
};

/**
 * GET /api/reports/scheduled/[id]
 * Get execution history for a scheduled report
 */
export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const { id } = params;

    if (!id) {
      return json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // Get limit from query params
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Get execution history
    const history = await scheduledReportService.getExecutionHistory(id, limit);

    return json({
      success: true,
      data: history
    });
  } catch (error: any) {
    console.error('Error fetching execution history:', error);
    return json(
      { success: false, error: error.message || 'Failed to fetch execution history' },
      { status: 500 }
    );
  }
};