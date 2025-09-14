import { json, error } from '@sveltejs/kit';
import { ProductionDataTemplateService } from '../services/ProductionDataTemplateService.js';
import { ProductionDataUploadService } from '../services/ProductionDataUploadService.js';
import { HistoricalAnalysisService } from '../services/HistoricalAnalysisService.js';
import { GenerateTemplateRequestSchema, type GenerateTemplateRequest } from '../models/requests/GenerateTemplateRequest.js';
import type { RequestHandler } from '@sveltejs/kit';

export class HistoricalAnalysisController {
	private templateService: ProductionDataTemplateService;
	private uploadService: ProductionDataUploadService;
	private historicalService: HistoricalAnalysisService;

	constructor() {
		this.templateService = new ProductionDataTemplateService();
		this.uploadService = new ProductionDataUploadService();
		this.historicalService = new HistoricalAnalysisService();
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
			// Get locationId and processing options from query parameters
			const locationId = url.searchParams.get('locationId');
			const batchSize = url.searchParams.get('batchSize');
			const skipDuplicates = url.searchParams.get('skipDuplicates') === 'true';
			const replaceExisting = url.searchParams.get('replaceExisting') === 'true';

			if (!locationId) {
				return error(400, 'Missing required parameter: locationId');
			}

			// Parse the form data
			const formData = await request.formData();
			const csvFile = formData.get('csvFile') as File;

			if (!csvFile) {
				return error(400, 'No CSV file provided');
			}

			// Validate file type and size
			if (!csvFile.name.endsWith('.csv') && csvFile.type !== 'text/csv') {
				return error(400, 'Invalid file type. Please upload a CSV file.');
			}

			// Check file size (limit to 50MB)
			if (csvFile.size > 50 * 1024 * 1024) {
				return error(400, 'File size too large. Maximum allowed size is 50MB.');
			}

			// Read and validate CSV content before processing
			const csvContent = await csvFile.text();

			// First, validate the CSV format
			const validationResult = await this.historicalService.validateCSVFormat(csvContent);

			if (!validationResult.success) {
				return error(400, `CSV validation failed: ${validationResult.error}`);
			}

			if (!validationResult.data?.isValid) {
				return json({
					success: false,
					message: 'CSV format validation failed',
					data: {
						isValid: false,
						errors: validationResult.metadata?.validationErrors || [],
						requiredColumns: validationResult.data?.requiredColumns || [],
						foundColumns: validationResult.data?.foundColumns || []
					}
				});
			}

			// Process CSV using the enhanced service with TimescaleDB optimization
			const result = await this.historicalService.processCSVFile({
				csvContent,
				locationId,
				options: {
					batchSize: batchSize ? parseInt(batchSize) : 1000,
					skipDuplicates,
					validateTimestamps: true,
					replaceExisting
				}
			});

			if (!result.success) {
				return json({
					success: false,
					message: `CSV processing failed: ${result.error}`,
					data: result.data,
					metadata: result.metadata
				});
			}

			console.log(`Historical Analysis: Successfully uploaded CSV for location ${locationId}`, result.data);

			return json({
				success: true,
				message: 'CSV data uploaded successfully with TimescaleDB optimization',
				data: {
					totalRows: result.data?.totalRows || 0,
					insertedRows: result.data?.insertedRows || 0,
					skippedRows: result.data?.skippedRows || 0,
					errors: result.data?.errors || [],
					processingTimeMs: result.data?.processingTimeMs || 0
				},
				metadata: {
					...result.metadata,
					fileName: csvFile.name,
					fileSize: csvFile.size,
					locationId,
					processingOptions: {
						batchSize: batchSize ? parseInt(batchSize) : 1000,
						skipDuplicates,
						replaceExisting
					}
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
			const includeStatistics = url.searchParams.get('includeStatistics') === 'true';

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

			// Get historical data using the enhanced service
			const result = await this.historicalService.getHistoricalData({
				locationId,
				startDate,
				endDate,
				limit,
				offset
			});

			if (!result.success) {
				return json({
					success: false,
					message: result.error,
					data: []
				});
			}

			// Get statistics if requested
			let statistics = undefined;
			if (includeStatistics) {
				const statsResult = await this.historicalService.getDataStatistics(
					locationId,
					startDate,
					endDate
				);

				if (statsResult.success) {
					statistics = statsResult.data;
				}
			}

			return json({
				success: true,
				data: result.data,
				metadata: {
					...result.metadata,
					query: {
						locationId,
						startDate,
						endDate,
						limit,
						offset
					}
				},
				statistics
			});

		} catch (err: any) {
			console.error('Error getting historical data:', err);

			return error(500, `Internal server error while retrieving historical data: ${err.message}`);
		}
	};

	/**
	 * Validate CSV format before upload
	 */
	validateCSV: RequestHandler = async ({ request }) => {
		try {
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

			// Read CSV content
			const csvContent = await csvFile.text();

			// Validate CSV format using the service
			const result = await this.historicalService.validateCSVFormat(csvContent);

			return json({
				success: result.success,
				data: result.data,
				error: result.error,
				metadata: {
					fileName: csvFile.name,
					fileSize: csvFile.size,
					validationErrors: result.metadata?.validationErrors || []
				}
			});

		} catch (err: any) {
			console.error('Error validating CSV:', err);

			return error(500, `Internal server error while validating CSV: ${err.message}`);
		}
	};

	/**
	 * Get data statistics for a location
	 */
	getDataStatistics: RequestHandler = async ({ params, url }) => {
		try {
			const locationId = params.locationId;
			if (!locationId) {
				return error(400, 'Missing locationId parameter');
			}

			// Get query parameters
			const startDate = url.searchParams.get('startDate') || undefined;
			const endDate = url.searchParams.get('endDate') || undefined;

			// Get statistics using the service
			const result = await this.historicalService.getDataStatistics(locationId, startDate, endDate);

			if (!result.success) {
				return json({
					success: false,
					message: result.error,
					data: {}
				});
			}

			return json({
				success: true,
				data: result.data,
				metadata: {
					locationId,
					dateRange: { startDate, endDate },
					calculatedAt: new Date().toISOString()
				}
			});

		} catch (err: any) {
			console.error('Error getting data statistics:', err);

			return error(500, `Internal server error while retrieving statistics: ${err.message}`);
		}
	};

	/**
	 * Delete historical data for a location (with confirmation)
	 */
	deleteHistoricalData: RequestHandler = async ({ params, url }) => {
		try {
			const locationId = params.locationId;
			if (!locationId) {
				return error(400, 'Missing locationId parameter');
			}

			// Get query parameters
			const startDate = url.searchParams.get('startDate') || undefined;
			const endDate = url.searchParams.get('endDate') || undefined;
			const confirm = url.searchParams.get('confirm') === 'true';

			if (!confirm) {
				return error(400, 'Deletion requires explicit confirmation. Add ?confirm=true to proceed.');
			}

			// Delete data using the service
			const result = await this.historicalService.deleteHistoricalData(
				locationId,
				startDate,
				endDate,
				confirm
			);

			if (!result.success) {
				return json({
					success: false,
					message: result.error,
					data: { deletedCount: 0 }
				});
			}

			return json({
				success: true,
				message: `Successfully deleted ${result.data?.deletedCount || 0} historical records`,
				data: result.data,
				metadata: result.metadata
			});

		} catch (err: any) {
			console.error('Error deleting historical data:', err);

			return error(500, `Internal server error while deleting data: ${err.message}`);
		}
	};
}