import type { RequestHandler } from './$types';
import { ReportsController } from '$lib/features/reports/controllers/ReportsController';

const controller = new ReportsController();

export const GET: RequestHandler = async (event) => {
    return controller.download(event);
};