import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AnalysisService } from '$lib/server/services/analysis.service';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const location = url.searchParams.get('location');
    const interval = url.searchParams.get('interval') || 'hourly';
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

    // Validate interval parameter
    const validIntervals = ['15min', 'hourly', 'daily', 'weekly'];
    if (!validIntervals.includes(interval)) {
      return json({ 
        success: false, 
        error: 'Invalid interval. Must be: 15min, hourly, daily, or weekly' 
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
    const result = await service.getWeatherAnalysis(location, interval, start, end);

    return json({
      success: true,
      ...result
    }, {
      headers: {
        'Cache-Control': 'public, max-age=180', // 3 minutes cache
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Analysis weather API error:', error);
    
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch weather analysis',
    }, { status: 500 });
  }
};

