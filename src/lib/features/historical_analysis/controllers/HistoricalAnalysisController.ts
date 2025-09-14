import { json, error } from '@sveltejs/kit';
import { ProductionDataTemplateService } from '../services/ProductionDataTemplateService.js';
import { GenerateTemplateRequestSchema, type GenerateTemplateRequest } from '../models/requests/GenerateTemplateRequest.js';
import type { RequestHandler } from '@sveltejs/kit';

export class HistoricalAnalysisController {
	private templateService: ProductionDataTemplateService;

	constructor() {
		this.templateService = new ProductionDataTemplateService();
	}

	generateTemplate: RequestHandler = async ({ url }) => {
		try {
			const searchParams = url.searchParams;

			// Extract parameters from query string
			const requestData: GenerateTemplateRequest = {
				location_name: searchParams.get('location_name') || undefined,
				location_guid: searchParams.get('location_guid') || undefined,
				time_aggregation: (searchParams.get('time_aggregation') as '15min' | 'hourly' | 'daily') || undefined,
				start_date: searchParams.get('start_date') || '',
				end_date: searchParams.get('end_date') || '',
				timezone: searchParams.get('timezone') || undefined
			};

			// Validate request
			const validatedData = GenerateTemplateRequestSchema.parse(requestData);

			// Get response format
			const format = searchParams.get('format') || 'csv';

			if (format === 'json') {
				const template = this.templateService.generateTemplate(validatedData);
				return json(template, {
					headers: {
						'Content-Type': 'application/json'
					}
				});
			} else {
				// Default to CSV with download headers
				const csv = this.templateService.generateCSV(validatedData);
				return new Response(csv, {
					headers: {
						'Content-Type': 'text/csv',
						'Content-Disposition': `attachment; filename="production_data_template_${validatedData.start_date}_to_${validatedData.end_date}.csv"`
					}
				});
			}
		} catch (err: any) {
			console.error('Error generating template:', err);

			if (err.name === 'ZodError') {
				return error(400, {
					message: 'Invalid request parameters',
					details: err.errors
				});
			}

			return error(500, {
				message: 'Internal server error while generating template',
				details: err.message
			});
		}
	};
}