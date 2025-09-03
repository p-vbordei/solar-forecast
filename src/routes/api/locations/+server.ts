import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LocationService } from '$lib/server/services/location.service';
import { LocationRepository } from '$lib/server/repositories/location.repository';
import type { LocationCreateInput, LocationFilter } from '$lib/types/location';

// Enhanced Controller for comprehensive location management
export const GET: RequestHandler = async ({ url }) => {
	try {
		const repository = new LocationRepository();
		const service = new LocationService(repository);
		
		// Get query parameters for filtering
		const clientId = url.searchParams.get('clientId');
		const status = url.searchParams.get('status');
		const minCapacity = url.searchParams.get('minCapacity');
		const maxCapacity = url.searchParams.get('maxCapacity');
		const technology = url.searchParams.get('technology');
		const mountingType = url.searchParams.get('mountingType');
		const search = url.searchParams.get('search');
		const view = url.searchParams.get('view'); // 'summary' | 'detailed' | 'technical'
		
		// Build filter object
		const filter: LocationFilter = {
			...(clientId && { clientId }),
			...(status && { status: status as any }),
			...(minCapacity && { minCapacity: parseFloat(minCapacity) }),
			...(maxCapacity && { maxCapacity: parseFloat(maxCapacity) }),
			...(technology && { technology: technology as any }),
			...(mountingType && { mountingType: mountingType as any }),
			...(search && { search })
		};
		
		// Get locations based on view type
		let locations;
		switch (view) {
			case 'summary':
				locations = await service.getLocationsSummary(filter);
				break;
			case 'technical':
				locations = await service.getLocationsTechnicalDetails(filter);
				break;
			default:
				locations = await service.getLocations(filter);
				break;
		}
		
		return json({
			success: true,
			data: locations,
			count: locations.length,
			filter: filter
		});
	} catch (error) {
		console.error('Error fetching locations:', error);
		return json({
			success: false,
			error: 'Failed to fetch locations',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const repository = new LocationRepository();
		const service = new LocationService(repository);
		
		const data: LocationCreateInput = await request.json();
		
		// Validate mandatory fields only (GPS coordinates + name)
		if (!data.name?.trim()) {
			return json({
				success: false,
				error: 'Location name is required',
				field: 'name'
			}, { status: 400 });
		}
		
		if (typeof data.latitude !== 'number' || data.latitude < -90 || data.latitude > 90) {
			return json({
				success: false,
				error: 'Valid latitude is required (-90 to 90)',
				field: 'latitude'
			}, { status: 400 });
		}
		
		if (typeof data.longitude !== 'number' || data.longitude < -180 || data.longitude > 180) {
			return json({
				success: false,
				error: 'Valid longitude is required (-180 to 180)',
				field: 'longitude'
			}, { status: 400 });
		}
		
		// Create location with smart defaults via service
		const location = await service.createLocationWithDefaults(data);
		
		return json({
			success: true,
			data: location,
			message: 'Location created successfully with optimized technical parameters'
		}, { status: 201 });
	} catch (error) {
		console.error('Error creating location:', error);
		
		// Handle specific validation errors
		if (error instanceof Error) {
			if (error.message.includes('already exists')) {
				return json({
					success: false,
					error: 'A location with this name already exists',
					field: 'name'
				}, { status: 409 });
			}
			
			if (error.message.includes('invalid')) {
				return json({
					success: false,
					error: error.message,
					field: 'validation'
				}, { status: 400 });
			}
		}
		
		return json({
			success: false,
			error: 'Failed to create location',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};

// Bulk operations endpoint
export const PATCH: RequestHandler = async ({ request }) => {
	try {
		const repository = new LocationRepository();
		const service = new LocationService(repository);
		
		const { operation, locationIds, data } = await request.json();
		
		switch (operation) {
			case 'bulk_update_status':
				const results = await service.bulkUpdateStatus(locationIds, data.status);
				return json({
					success: true,
					data: results,
					message: `Updated status for ${results.length} locations`
				});
				
			case 'bulk_calibrate':
				const calibrationResults = await service.bulkCalibrate(locationIds);
				return json({
					success: true,
					data: calibrationResults,
					message: `Calibrated ${calibrationResults.length} locations`
				});
				
			case 'bulk_export':
				const exportData = await service.bulkExportTechnicalSpecs(locationIds);
				return json({
					success: true,
					data: exportData,
					message: 'Technical specifications exported successfully'
				});
				
			default:
				return json({
					success: false,
					error: 'Invalid bulk operation'
				}, { status: 400 });
		}
	} catch (error) {
		console.error('Error performing bulk operation:', error);
		return json({
			success: false,
			error: 'Failed to perform bulk operation',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};