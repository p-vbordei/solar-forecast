import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DashboardService } from '$lib/server/services/dashboard.service';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const clientId = url.searchParams.get('client_id') ? 
      parseInt(url.searchParams.get('client_id')!) : undefined;

    const service = new DashboardService();
    const locations = await service.getAvailableLocations();

    // Filter locations by client if clientId is provided
    // This would need to be enhanced based on your multi-tenant structure
    const filteredLocations = locations.filter(location => location.isActive);

    const response = {
      success: true,
      data: filteredLocations,
      count: filteredLocations.length,
      timestamp: new Date().toISOString()
    };

    return json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Locations API error:', error);
    
    return json({ 
      success: false, 
      error: 'Failed to fetch locations',
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