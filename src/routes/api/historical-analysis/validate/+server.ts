import { HistoricalAnalysisController } from '$lib/features/historical_analysis/controllers/HistoricalAnalysisController.js';

const controller = new HistoricalAnalysisController();

// Validate CSV format before upload
export const POST = controller.validateCSV;