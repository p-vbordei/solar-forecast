import { BadRequestError } from '$lib/utils/ApiErrors';
import { TemplateRegistry } from '../templates/registry';
import { DataServiceRegistry } from '../sources/DataServiceRegistry';
import type { GenerateReportParams, ReportResult } from '../models/ReportTypes';

export class ReportsService {
    private templateRegistry = new TemplateRegistry();
    private dataServiceRegistry = new DataServiceRegistry();

    /**
     * Generate report based on template and parameters
     */
    async generate(params: GenerateReportParams): Promise<ReportResult> {
        const { template, from, to, tz } = params;

        // Get template from registry
        const templateConfig = this.templateRegistry.getTemplate(template);
        if (!templateConfig) {
            throw new BadRequestError(`Unknown template: ${template}`, 'template');
        }

        // Log template selection
        console.log('[ReportsService] Using template:', {
            name: template,
            mode: templateConfig.mode,
            dataSource: templateConfig.dataSourceKey
        });

        // Get data service for this template
        const dataService = this.dataServiceRegistry.getDataService(templateConfig.dataSourceKey);
        if (!dataService) {
            throw new Error(`Data service not found: ${templateConfig.dataSourceKey}`);
        }

        // Fetch data from data service
        const startFetch = Date.now();
        const data = await dataService.fetch(from, to, tz);
        console.log('[ReportsService] Data fetched:', {
            rows: data.rows.length,
            duration: `${Date.now() - startFetch}ms`
        });

        // Build or load workbook based on mode
        let workbook;
        if (templateConfig.mode === 'FILE') {
            // Load existing Excel template
            workbook = await templateConfig.loadTemplate();
        } else {
            // Build workbook from code
            workbook = templateConfig.build();
        }

        // Render data into workbook
        const startRender = Date.now();
        templateConfig.render(workbook, data, { from, to, tz });
        console.log('[ReportsService] Workbook rendered:', {
            duration: `${Date.now() - startRender}ms`
        });

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Generate filename
        const filename = this.generateFilename(template, from, to);

        return {
            buffer: buffer as ArrayBuffer,
            filename
        };
    }

    /**
     * Generate filename with UTC timestamps
     */
    private generateFilename(template: string, from: Date, to: Date): string {
        const formatDateTime = (date: Date): string => {
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            const hours = String(date.getUTCHours()).padStart(2, '0');
            const minutes = String(date.getUTCMinutes()).padStart(2, '0');
            return `${year}${month}${day}-${hours}${minutes}`;
        };

        const fromStr = formatDateTime(from);
        const toStr = formatDateTime(to);

        return `report_${template}_${fromStr}_${toStr}.xlsx`;
    }
}