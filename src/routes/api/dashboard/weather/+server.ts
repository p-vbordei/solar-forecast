import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DashboardService } from '$lib/server/services/dashboard.service';
import type { WeatherResponse, TimeRange } from '$lib/types/dashboard';

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Extract and validate parameters
    const locationId = parseInt(url.searchParams.get('location_id') ?? '1');
    const timeRange = (url.searchParams.get('time_range') ?? 'today') as TimeRange;
    const clientId = url.searchParams.get('client_id') ? 
      parseInt(url.searchParams.get('client_id')!) : undefined;

    // Validate locationId
    if (isNaN(locationId) || locationId < 1) {
      return json({ 
        success: false, 
        error: 'Invalid location_id parameter' 
      }, { status: 400 });
    }

    // Validate timeRange
    const validTimeRanges: TimeRange[] = ['today', 'tomorrow', '7days'];
    if (!validTimeRanges.includes(timeRange)) {
      return json({ 
        success: false, 
        error: 'Invalid time_range parameter. Must be: today, tomorrow, or 7days' 
      }, { status: 400 });
    }

    const service = new DashboardService();
    
    // Validate location access
    const hasAccess = await service.validateLocationAccess(locationId, clientId);
    if (!hasAccess) {
      return json({ 
        success: false, 
        error: 'Location not found or access denied' 
      }, { status: 404 });
    }

    // Fetch location details and weather data in parallel
    const [locationDetails, weatherData] = await Promise.all([
      service.getLocationDetails(locationId),
      service.getWeatherData(locationId, timeRange)
    ]);

    if (!locationDetails) {
      return json({ 
        success: false, 
        error: 'Location not found' 
      }, { status: 404 });
    }

    const response: WeatherResponse = {
      success: true,
      data: weatherData,
      locationId: locationDetails.id,
      locationName: `${locationDetails.name} - ${locationDetails.city}`,
      timeRange
    };

    // Set appropriate cache duration based on time range
    let cacheMaxAge = 300; // 5 minutes default
    if (timeRange === 'today') {
      cacheMaxAge = 180; // 3 minutes for today (more frequent updates)
    } else if (timeRange === 'tomorrow') {
      cacheMaxAge = 600; // 10 minutes for tomorrow
    } else if (timeRange === '7days') {
      cacheMaxAge = 1800; // 30 minutes for 7 days
    }

    return json(response, {
      headers: {
        'Cache-Control': `public, max-age=${cacheMaxAge}`,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Weather data API error:', error);
    
    return json({ 
      success: false, 
      error: 'Failed to fetch weather data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
};