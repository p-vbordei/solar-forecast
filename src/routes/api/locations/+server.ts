import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LocationService } from '$lib/server/services/location.service';
import { LocationRepository } from '$lib/server/repositories/location.repository';

// Controller - handles HTTP requests
export const GET: RequestHandler = async ({ url }) => {
	try {
		const repository = new LocationRepository();
		const service = new LocationService(repository);
		
		// Get query parameters
		const clientId = url.searchParams.get('clientId');
		const status = url.searchParams.get('status');
		
		// Delegate to service
		const locations = await service.getLocations({
			clientId: clientId ? parseInt(clientId) : undefined,
			status: status as 'active' | 'maintenance' | 'offline' | undefined
		});
		
		return json({
			success: true,
			data: locations,
			count: locations.length
		});
	} catch (error) {
		console.error('Error fetching locations:', error);
		return json({
			success: false,
			error: 'Failed to fetch locations'
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const repository = new LocationRepository();
		const service = new LocationService(repository);
		
		const data = await request.json();
		
		// Validate required fields
		if (!data.name || !data.latitude || !data.longitude || !data.capacity) {
			return json({
				success: false,
				error: 'Missing required fields'
			}, { status: 400 });
		}
		
		// Create location via service
		const location = await service.createLocation(data);
		
		return json({
			success: true,
			data: location
		}, { status: 201 });
	} catch (error) {
		console.error('Error creating location:', error);
		return json({
			success: false,
			error: 'Failed to create location'
		}, { status: 500 });
	}
};