import { HistoricalAnalysisController } from '$lib/features/historical_analysis/controllers/HistoricalAnalysisController.js';

const controller = new HistoricalAnalysisController();

export const GET = controller.generateTemplate;