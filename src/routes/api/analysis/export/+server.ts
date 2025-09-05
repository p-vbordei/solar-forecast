import { json, type RequestHandler } from '@sveltejs/kit';
import { AnalysisService } from '$lib/server/services/analysis.service';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { location, interval, start, end, format } = data;

    // Validate required parameters
    if (!location) {
      return json({ 
        success: false, 
        error: 'Location parameter is required' 
      }, { status: 400 });
    }

    if (!format) {
      return json({ 
        success: false, 
        error: 'Format parameter is required' 
      }, { status: 400 });
    }

    if (!start || !end) {
      return json({ 
        success: false, 
        error: 'Start and end date parameters are required' 
      }, { status: 400 });
    }

    // Validate format parameter
    const validFormats = ['csv', 'excel', 'pdf'];
    if (!validFormats.includes(format)) {
      return json({ 
        success: false, 
        error: 'Invalid format. Must be: csv, excel, or pdf' 
      }, { status: 400 });
    }

    // Validate interval parameter
    const validIntervals = ['15min', 'hourly', 'daily', 'weekly'];
    const intervalParam = interval || 'hourly';
    if (!validIntervals.includes(intervalParam)) {
      return json({ 
        success: false, 
        error: 'Invalid interval. Must be: 15min, hourly, daily, or weekly' 
      }, { status: 400 });
    }

    const service = new AnalysisService();
    const exportResult = await service.generateExportData(location, intervalParam, start, end, format);

    return new Response(exportResult.content, {
      headers: {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`
      }
    });

  } catch (error) {
    console.error('Analysis export API error:', error);
    
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to export analysis data',
    }, { status: 500 });
  }
};