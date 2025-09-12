import type { RequestHandler } from './$types';
import { LocationsController } from '$lib/features/locations/controllers/LocationsController';

const controller = new LocationsController();

// Delegate to controller
export const GET: RequestHandler = (event) => controller.getLocationById(event);

export const PUT: RequestHandler = (event) => controller.updateLocation(event);

export const DELETE: RequestHandler = (event) => controller.deleteLocation(event);

