import { json, error } from '@sveltejs/kit';
import { ProductionDataTemplateService } from '../services/ProductionDataTemplateService.js';
import { ProductionDataUploadService } from '../services/ProductionDataUploadService.js';
import { GenerateTemplateRequestSchema, type GenerateTemplateRequest } from '../models/requests/GenerateTemplateRequest.js';
import type { RequestHandler } from '@sveltejs/kit';

export class HistoricalAnalysisController {
	private templateService: ProductionDataTemplateService;
	private uploadService: ProductionDataUploadService;

	constructor() {
		this.templateService = new ProductionDataTemplateService();
		this.uploadService = new ProductionDataUploadService();
	}

	generateTemplate: RequestHandler = async ({ url }) => {
		try {
			const searchParams = url.searchParams;

			// Extract parameters from query string
			const requestData = {
				location_name: searchParams.get('location_name') || undefined,
				location_guid: searchParams.get('location_guid') || undefined,
				time_aggregation: searchParams.get('time_aggregation') || undefined,
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
				return error(400, `Invalid request parameters: ${err.errors.map((e: any) => e.message).join(', ')}`);
			}

			return error(500, `Internal server error while generating template: ${err.message}`);
		}
	};

	uploadCSV: RequestHandler = async ({ request, url }) => {
		try {
			// Get locationId from query parameters
			const locationId = url.searchParams.get('locationId');
			if (!locationId) {
				return error(400, 'Missing required parameter: locationId');
			}

			// Parse the form data
			const formData = await request.formData();
			const csvFile = formData.get('csvFile') as File;

			if (!csvFile) {
				return error(400, 'No CSV file provided');
			}

			// Validate file type
			if (!csvFile.name.endsWith('.csv') && csvFile.type !== 'text/csv') {
				return error(400, 'Invalid file type. Please upload a CSV file.');
			}

			// Read and parse CSV content
			const csvContent = await csvFile.text();
			const result = await this.uploadService.parseAndInsertCSV(csvContent, locationId);

			return json({
				success: true,
				message: 'CSV data uploaded successfully',
				data: {
					totalRows: result.totalRows,
					insertedRows: result.insertedRows,
					skippedRows: result.skippedRows,
					errors: result.errors
				}
			});

		} catch (err: any) {
			console.error('Error uploading CSV:', err);

			return error(500, `Internal server error while uploading CSV: ${err.message}`);
		}
	};

	getHistoricalData: RequestHandler = async ({ params, url }) => {
		try {
			const locationId = params.locationId;
			if (!locationId) {
				return error(400, 'Missing locationId parameter');
			}

			// Get query parameters
			const startDate = url.searchParams.get('startDate') || undefined;
			const endDate = url.searchParams.get('endDate') || undefined;
			const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined;
			const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : undefined;

			// Validate limit and offset
			if (limit && (limit < 1 || limit > 10000)) {
				return error(400, {
					message: 'Limit must be between 1 and 10000'
				});
			}

			if (offset && offset < 0) {
				return error(400, {
					message: 'Offset must be 0 or greater'
				});
			}

			// Get historical data
			const result = await this.uploadService.getHistoricalData({
				locationId,
				startDate,
				endDate,
				limit,
				offset
			});

			return json(result);

		} catch (err: any) {
			console.error('Error getting historical data:', err);

			return error(500, `Internal server error while retrieving historical data: ${err.message}`);
		}
	};
}