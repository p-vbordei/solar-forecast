import type { RequestEvent } from '@sveltejs/kit';
import type { CreateLocationRequest } from '$lib/features/locations/models/requests/CreateLocationRequest';
import { CoordinatesValidator } from '$lib/features/locations/helpers/CoordinatesValidator';
import { LocationsService } from '$lib/features/locations/services/LocationsService';
import { ApiResponse } from '$lib/utils/ApiResponse';
import { ErrorHandler, withErrorHandling } from '$lib/utils/ErrorHandler';
import { BadRequestError, LocationNotFoundError } from '$lib/utils/ApiErrors';

export class LocationsController {
    private locationsService = new LocationsService();
    /**
     * GET /api/locations
     * Get all locations with optional filtering
     */
    async getAllLocations(event: RequestEvent): Promise<Response> {
        return withErrorHandling(async () => {
            const { url } = event;
            
            // Get query parameters for filtering
            const search = url.searchParams.get('search');
            const status = url.searchParams.get('status');
            const limit = parseInt(url.searchParams.get('limit') ?? '50');
            const offset = parseInt(url.searchParams.get('offset') ?? '0');
            
            // Validate pagination parameters
            if (limit < 1 || limit > 100) {
                throw new BadRequestError('Limit must be between 1 and 100', 'limit');
            }
            
            if (offset < 0) {
                throw new BadRequestError('Offset must be non-negative', 'offset');
            }
            
            // Call service layer to get all locations with filters
            const result = await this.locationsService.getAllLocations({
                search,
                status,
                limit,
                offset
            });
            
            return ApiResponse.successWithPagination(
                result.locations,
                result.pagination,
                result.filters
            );
        })();
    }

    /**
     * GET /api/locations/{id}
     * Get a specific location by GUID
     */
    async getLocationById(event: RequestEvent): Promise<Response> {
        return withErrorHandling(async () => {
            const locationId = event.params.id!; // GUID is mandatory in path
            
            // Call service layer to get location by GUID
            const location = await this.locationsService.getLocationById(locationId);
            
            return ApiResponse.success(location);
        })();
    }

    /**
     * PUT /api/locations/{id}
     * Update a specific location by GUID
     */
    async updateLocation(event: RequestEvent): Promise<Response> {
        return withErrorHandling(async () => {
            const locationId = event.params.id!; // GUID is mandatory in path
            
            // Parse request body
            const updateData = await event.request.json();
            
            // Call service layer to update location by GUID
            const updatedLocation = await this.locationsService.updateLocation(locationId, updateData);
            
            return ApiResponse.success(updatedLocation, 'Location updated successfully');
        })();
    }

    /**
     * DELETE /api/locations/{id}
     * Soft delete a specific location by GUID
     */
    async deleteLocation(event: RequestEvent): Promise<Response> {
        return withErrorHandling(async () => {
            const locationId = event.params.id!; // GUID is mandatory in path
            
            // Call service layer to delete location by GUID
            await this.locationsService.deleteLocation(locationId);
            
            return ApiResponse.success(undefined, 'Location deleted successfully');
        })();
    }

    /**
     * POST /api/locations
     * Creates a new location with the provided configuration
     */
    async createLocation(event: RequestEvent): Promise<Response> {
        return withErrorHandling(async () => {
            // Parse request body
            const requestData: CreateLocationRequest = await event.request.json();
            
            // Validate required fields using CoordinatesValidator
            CoordinatesValidator.validateCreateLocationRequest(requestData);
            
            // Call service layer to create location
            const createdLocation = await this.locationsService.createLocation(requestData);
            
            return ApiResponse.created(createdLocation, 'Location created successfully');
        })();
    }
}