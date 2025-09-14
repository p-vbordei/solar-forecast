import { HistoricalAnalysisController } from '$lib/features/historical_analysis/controllers/HistoricalAnalysisController.js';

const controller = new HistoricalAnalysisController();

// Get historical data for a location
export const GET = controller.getHistoricalData;

// Delete historical data for a location (with confirmation)
export const DELETE = controller.deleteHistoricalData;