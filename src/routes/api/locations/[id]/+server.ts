import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LocationService } from '$lib/server/services/location.service';
import { LocationRepository } from '$lib/server/repositories/location.repository';
import type { LocationUpdateInput } from '$lib/types/location';

// Get specific location with full technical details
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const repository = new LocationRepository();
		const service = new LocationService(repository);
		
		const locationId = params.id;
		const includeHistory = url.searchParams.get('history') === 'true';
		const view = url.searchParams.get('view') || 'detailed'; // 'summary' | 'detailed' | 'technical' | 'history'
		
		if (!locationId) {
			return json({
				success: false,
				error: 'Location ID is required'
			}, { status: 400 });
		}
		
		let location;
		switch (view) {
			case 'summary':
				location = await service.getLocationSummary(locationId);
				break;
			case 'technical':
				location = await service.getLocationTechnicalDetails(locationId);
				break;
			case 'history':
				location = await service.getLocationWithHistory(locationId);
				break;
			default:
				location = await service.getLocationById(locationId);
				break;
		}
		
		if (!location) {
			return json({
				success: false,
				error: 'Location not found'
			}, { status: 404 });
		}
		
		// Include version history if requested
		if (includeHistory && view !== 'history') {
			const history = await service.getLocationVersionHistory(locationId);
			return json({
				success: true,
				data: {
					...location,
					history
				}
			});
		}
		
		return json({
			success: true,
			data: location
		});
	} catch (error) {
		console.error('Error fetching location:', error);
		return json({
			success: false,
			error: 'Failed to fetch location',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};

// Update location with versioning support
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const repository = new LocationRepository();
		const service = new LocationService(repository);
		
		const locationId = params.id;
		const data: LocationUpdateInput = await request.json();
		
		if (!locationId) {
			return json({
				success: false,
				error: 'Location ID is required'
			}, { status: 400 });
		}
		
		// Add ID to data
		data.id = locationId;
		
		// Validate mandatory fields if provided
		if (data.name !== undefined && !data.name?.trim()) {
			return json({
				success: false,
				error: 'Location name cannot be empty',
				field: 'name'
			}, { status: 400 });
		}
		
		if (data.latitude !== undefined && (typeof data.latitude !== 'number' || data.latitude < -90 || data.latitude > 90)) {
			return json({
				success: false,
				error: 'Valid latitude is required (-90 to 90)',
				field: 'latitude'
			}, { status: 400 });
		}
		
		if (data.longitude !== undefined && (typeof data.longitude !== 'number' || data.longitude < -180 || data.longitude > 180)) {
			return json({
				success: false,
				error: 'Valid longitude is required (-180 to 180)',
				field: 'longitude'
			}, { status: 400 });
		}
		
		// Update location with version control
		const updatedLocation = await service.updateLocationWithVersioning(data);
		
		return json({
			success: true,
			data: updatedLocation,
			message: 'Location updated successfully'
		});
	} catch (error) {
		console.error('Error updating location:', error);
		
		// Handle specific errors
		if (error instanceof Error) {
			if (error.message.includes('not found')) {
				return json({
					success: false,
					error: 'Location not found'
				}, { status: 404 });
			}
			
			if (error.message.includes('version conflict')) {
				return json({
					success: false,
					error: 'Location was modified by another user. Please refresh and try again.',
					code: 'VERSION_CONFLICT'
				}, { status: 409 });
			}
			
			if (error.message.includes('validation')) {
				return json({
					success: false,
					error: error.message,
					field: 'validation'
				}, { status: 400 });
			}
		}
		
		return json({
			success: false,
			error: 'Failed to update location',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};

// Delete location (soft delete with history preservation)
export const DELETE: RequestHandler = async ({ params, url }) => {
	try {
		const repository = new LocationRepository();
		const service = new LocationService(repository);
		
		const locationId = params.id;
		const hard = url.searchParams.get('hard') === 'true'; // Force complete deletion
		
		if (!locationId) {
			return json({
				success: false,
				error: 'Location ID is required'
			}, { status: 400 });
		}
		
		let result;
		if (hard) {
			result = await service.hardDeleteLocation(locationId);
		} else {
			result = await service.softDeleteLocation(locationId);
		}
		
		if (!result) {
			return json({
				success: false,
				error: 'Location not found'
			}, { status: 404 });
		}
		
		return json({
			success: true,
			message: hard ? 'Location permanently deleted' : 'Location archived successfully',
			data: { id: locationId, deleted: true, hard }
		});
	} catch (error) {
		console.error('Error deleting location:', error);
		return json({
			success: false,
			error: 'Failed to delete location',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};

// Partial updates (PATCH) for specific operations
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const repository = new LocationRepository();
		const service = new LocationService(repository);
		
		const locationId = params.id;
		const { operation, data } = await request.json();
		
		if (!locationId) {
			return json({
				success: false,
				error: 'Location ID is required'
			}, { status: 400 });
		}
		
		let result;
		switch (operation) {
			case 'update_status':
				result = await service.updateLocationStatus(locationId, data.status);
				break;
				
			case 'calibrate':
				result = await service.calibrateLocation(locationId, data);
				break;
				
			case 'update_technical_params':
				result = await service.updateTechnicalParameters(locationId, data);
				break;
				
			case 'add_note':
				result = await service.addLocationNote(locationId, data.note, data.author);
				break;
				
			case 'update_monitoring':
				result = await service.updateMonitoringSettings(locationId, data);
				break;
				
			case 'reset_to_defaults':
				result = await service.resetLocationToDefaults(locationId, data.sections);
				break;
				
			case 'export_yaml':
				result = await service.exportLocationAsYAML(locationId);
				return json({
					success: true,
					data: result,
					contentType: 'application/yaml'
				});
				
			case 'validate_config':
				result = await service.validateLocationConfiguration(locationId);
				break;
				
			default:
				return json({
					success: false,
					error: 'Invalid operation'
				}, { status: 400 });
		}
		
		return json({
			success: true,
			data: result,
			message: `Operation '${operation}' completed successfully`
		});
	} catch (error) {
		console.error(`Error performing operation:`, error);
		return json({
			success: false,
			error: 'Failed to perform operation',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};