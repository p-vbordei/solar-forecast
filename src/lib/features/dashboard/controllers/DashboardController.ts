import type { RequestEvent } from '@sveltejs/kit';
import { DashboardService } from '$lib/features/dashboard/services/DashboardService';
import { ApiResponse } from '$lib/utils/ApiResponse';
import { withErrorHandling } from '$lib/utils/ErrorHandler';

export class DashboardController {
    private dashboardService = new DashboardService();

    /**
     * GET /api/dashboard
     * Get dashboard statistics including active locations, total capacity, solar power, and temperature
     */
    async getDashboardStats(event: RequestEvent): Promise<Response> {
        return withErrorHandling(async () => {
            // Call service layer to get dashboard statistics
            const stats = await this.dashboardService.getDashboardStats();

            return ApiResponse.success(stats);
        })();
    }
}