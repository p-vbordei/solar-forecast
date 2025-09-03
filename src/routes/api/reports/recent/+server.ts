import { json, type RequestHandler } from '@sveltejs/kit';
import { reportService } from '$lib/server/services/report.service';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const limit = url.searchParams.get('limit') || '10';
    const recentReports = await reportService.getRecentReports(parseInt(limit));

    return json({
      success: true,
      data: recentReports
    });
  } catch (error) {
    console.error('Error fetching recent reports:', error);
    return json(
      { success: false, error: 'Failed to fetch recent reports' },
      { status: 500 }
    );
  }
};