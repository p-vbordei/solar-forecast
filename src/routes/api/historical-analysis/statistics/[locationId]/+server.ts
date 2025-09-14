import { HistoricalAnalysisController } from '$lib/features/historical_analysis/controllers/HistoricalAnalysisController.js';

const controller = new HistoricalAnalysisController();

// Get data statistics and quality metrics for a location
export const GET = controller.getDataStatistics;