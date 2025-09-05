import { json, type RequestHandler } from '@sveltejs/kit';
import { AnalysisService } from '$lib/server/services/analysis.service';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const location = url.searchParams.get('location');
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');

    // Validate required parameters
    if (!location) {
      return json({ 
        success: false, 
        error: 'Location parameter is required' 
      }, { status: 400 });
    }

    if (!start || !end) {
      return json({ 
        success: false, 
        error: 'Start and end date parameters are required' 
      }, { status: 400 });
    }

    // Validate date format
    if (isNaN(Date.parse(start)) || isNaN(Date.parse(end))) {
      return json({ 
        success: false, 
        error: 'Invalid date format' 
      }, { status: 400 });
    }

    const service = new AnalysisService();
    const result = await service.getAccuracyMetrics(location, start, end);

    return json({
      success: true,
      data: result
    }, {
      headers: {
        'Cache-Control': 'public, max-age=600', // 10 minutes cache
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Analysis accuracy API error:', error);
    
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch accuracy metrics',
    }, { status: 500 });
  }
};