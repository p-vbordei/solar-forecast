import type { RequestHandler } from './$types';
import { LocationsController } from '$lib/features/locations/controllers/LocationsController';

const controller = new LocationsController();

// Delegate to controller
export const GET: RequestHandler = (event) => controller.getAllLocations(event);
export const POST: RequestHandler = async (event) => {
    console.log('POST /api/locations - Request received');
    try {
        const result = await controller.createLocation(event);
        console.log('POST /api/locations - Success');
        return result;
    } catch (error) {
        console.error('POST /api/locations - Error:', error);
        throw error;
    }
};