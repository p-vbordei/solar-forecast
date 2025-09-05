import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DashboardService } from '$lib/server/services/dashboard.service';
import type { DashboardResponse } from '$lib/types/dashboard';

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Extract and validate parameters
    const locationId = parseInt(url.searchParams.get('location_id') ?? '1');
    const clientId = url.searchParams.get('client_id') ? 
      parseInt(url.searchParams.get('client_id')!) : undefined;

    if (isNaN(locationId) || locationId < 1) {
      return json({ 
        success: false, 
        error: 'Invalid location_id parameter' 
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

    // Fetch location details and metrics in parallel
    const [locationDetails, dashboardMetrics] = await Promise.all([
      service.getLocationDetails(locationId),
      service.getDashboardMetrics(locationId)
    ]);

    if (!locationDetails) {
      return json({ 
        success: false, 
        error: 'Location not found' 
      }, { status: 404 });
    }

    const response: DashboardResponse = {
      success: true,
      data: dashboardMetrics,
      locationId: locationDetails.id,
      locationName: `${locationDetails.name} - ${locationDetails.city}`,
      timestamp: new Date().toISOString()
    };

    return json(response, {
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Dashboard metrics API error:', error);
    
    return json({ 
      success: false, 
      error: 'Failed to fetch dashboard metrics',
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