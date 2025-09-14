import { HistoricalAnalysisController } from '$lib/features/historical_analysis/controllers/HistoricalAnalysisController.js';

const controller = new HistoricalAnalysisController();

// Handle CSV file upload and processing
export const POST = controller.uploadCSV;