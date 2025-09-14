import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { LocationsService } from '$lib/features/locations/services/LocationsService';

/**
 * GET /api/locations/list
 * Returns a simplified list of locations with id and name for dropdowns/selection
 */
export const GET: RequestHandler = async () => {
	try {
		const locationsService = new LocationsService();

		// Get all active locations from database
		const result = await locationsService.getAllLocations({
			status: 'ACTIVE',
			limit: 1000, // Get all active locations
			offset: 0
		});

		// Transform to template generator format
		const locations = result.locations.map(location => ({
			id: location.id,
			name: location.name,
			coordinates: location.latitude && location.longitude
				? `${location.latitude}, ${location.longitude}`
				: 'Coordinates not available'
		}));

		return json({
			success: true,
			data: locations,
			message: 'Locations retrieved successfully'
		});
	} catch (error) {
		console.error('Error fetching locations list:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch locations list',
				data: []
			},
			{ status: 500 }
		);
	}
};