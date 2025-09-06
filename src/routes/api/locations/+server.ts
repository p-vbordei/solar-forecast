import type { RequestHandler } from './$types';
import { LocationsController } from '$lib/features/locations/controllers/LocationsController';

const controller = new LocationsController();

// Delegate to controller
export const GET: RequestHandler = (event) => controller.getAllLocations(event);
export const POST: RequestHandler = (event) => controller.createLocation(event);