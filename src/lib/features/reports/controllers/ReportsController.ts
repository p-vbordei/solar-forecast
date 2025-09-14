import type { RequestEvent } from '@sveltejs/kit';
import { ReportsService } from '$lib/features/reports/services/ReportsService';
import { withErrorHandling } from '$lib/utils/ErrorHandler';
import { BadRequestError } from '$lib/utils/ApiErrors';

export class ReportsController {
    private reportsService = new ReportsService();

    /**
     * GET /api/reports
     * Download Excel report based on template and date range
     */
    async download(event: RequestEvent): Promise<Response> {
        return withErrorHandling(async () => {
            const { url } = event;

            // Extract query parameters
            const template = url.searchParams.get('template');
            const from = url.searchParams.get('from');
            const to = url.searchParams.get('to');
            const tz = url.searchParams.get('tz') ?? 'Europe/Bucharest';

            // Validate required parameters
            if (!template) {
                throw new BadRequestError('Missing ?template parameter', 'template');
            }

            if (!from) {
                throw new BadRequestError('Missing ?from parameter', 'from');
            }

            if (!to) {
                throw new BadRequestError('Missing ?to parameter', 'to');
            }

            // Parse and validate dates
            const fromDate = new Date(from);
            const toDate = new Date(to);

            if (isNaN(fromDate.getTime())) {
                throw new BadRequestError('Invalid ?from date format. Use ISO 8601', 'from');
            }

            if (isNaN(toDate.getTime())) {
                throw new BadRequestError('Invalid ?to date format. Use ISO 8601', 'to');
            }

            // Validate date range
            if (fromDate > toDate) {
                throw new BadRequestError('?from must be <= ?to', 'from');
            }

            // Log request for observability
            const startTime = Date.now();
            console.log('[ReportsController] Generating report:', {
                template,
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
                tz
            });

            // Call service layer to generate report
            const result = await this.reportsService.generate({
                template,
                from: fromDate,
                to: toDate,
                tz
            });

            // Log completion
            const duration = Date.now() - startTime;
            console.log('[ReportsController] Report generated:', {
                template,
                duration: `${duration}ms`,
                size: result.buffer.byteLength
            });

            // Return Excel file as response
            return new Response(result.buffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${result.filename}"`,
                    'Content-Length': result.buffer.byteLength.toString(),
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
        })();
    }
}