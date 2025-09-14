import type { RequestHandler } from './$types';
import { DashboardController } from '$lib/features/dashboard/controllers/DashboardController';

const controller = new DashboardController();

export const GET: RequestHandler = async (event) => {
    return controller.getDashboardStats(event);
};