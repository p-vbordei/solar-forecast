import { HistoricalAnalysisRepository, type CSVUploadResult, type ProductionDataRow, type HistoricalDataQuery } from '../repositories/HistoricalAnalysisRepository.js';
import { ProductionDataUploadService } from './ProductionDataUploadService.js';

export interface HistoricalAnalysisResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
	metadata?: any;
}

export interface CSVProcessingRequest {
	csvContent: string;
	locationId: string;
	options?: {
		batchSize?: number;
		skipDuplicates?: boolean;
		validateTimestamps?: boolean;
		replaceExisting?: boolean;
	};
}

/**
 * Service layer for Historical Analysis
 * Coordinates between repository and upload service for CSV processing and data retrieval
 */
export class HistoricalAnalysisService {
	private repository: HistoricalAnalysisRepository;
	private uploadService: ProductionDataUploadService;

	constructor() {
		this.repository = new HistoricalAnalysisRepository();
		this.uploadService = new ProductionDataUploadService();
	}

	/**
	 * Process CSV file with enhanced validation and TimescaleDB optimization
	 */
	async processCSVFile(request: CSVProcessingRequest): Promise<HistoricalAnalysisResponse<CSVUploadResult>> {
		const startTime = Date.now();

		try {
			console.log(`Historical Analysis: Processing CSV for location ${request.locationId}`);

			// Parse and validate CSV structure
			const parseResult = await this.repository.parseCSVContent(request.csvContent);

			if (parseResult.errors.length > 0) {
				return {
					success: false,
					error: `CSV parsing errors: ${parseResult.errors.join('; ')}`,
					metadata: {
						parseErrors: parseResult.errors,
						processingTimeMs: Date.now() - startTime
					}
				};
			}

			// Convert parsed data to ProductionDataRow format
			const productionData = this.convertToProductionData(
				parseResult.headers,
				parseResult.dataRows
			);

			// Handle replace existing data if requested
			if (request.options?.replaceExisting) {
				await this.handleDataReplacement(request.locationId, productionData);
			}

			// Bulk insert using TimescaleDB optimization
			const bulkInsertResult = await this.repository.bulkInsertProductionData(
				productionData,
				request.locationId,
				{
					batchSize: request.options?.batchSize || 1000,
					validateTimestamps: request.options?.validateTimestamps || true,
					onConflict: request.options?.skipDuplicates ? 'ignore' : 'update'
				}
			);

			console.log(`Historical Analysis: Successfully processed ${bulkInsertResult.insertedRows} records in ${bulkInsertResult.processingTimeMs}ms`);

			return {
				success: true,
				data: bulkInsertResult,
				metadata: {
					csvMetadata: parseResult.metadata,
					processingTimeMs: Date.now() - startTime,
					optimizationUsed: 'TimescaleDB bulk insert'
				}
			};

		} catch (error: any) {
			console.error('Historical Analysis: CSV processing failed:', error);

			return {
				success: false,
				error: error.message,
				metadata: {
					processingTimeMs: Date.now() - startTime
				}
			};
		}
	}

	/**
	 * Get historical data with intelligent aggregation
	 */
	async getHistoricalData(query: HistoricalDataQuery): Promise<HistoricalAnalysisResponse<any>> {
		try {
			console.log(`Historical Analysis: Retrieving data for location ${query.locationId}`);

			const result = await this.repository.getHistoricalData(query);

			return {
				success: true,
				data: result.data,
				metadata: {
					...result.metadata,
					optimizationUsed: result.metadata?.aggregationType !== 'raw'
						? 'TimescaleDB time bucket aggregation'
						: 'Raw data query'
				}
			};

		} catch (error: any) {
			console.error('Historical Analysis: Data retrieval failed:', error);

			return {
				success: false,
				error: error.message
			};
		}
	}

	/**
	 * Get data statistics and quality metrics
	 */
	async getDataStatistics(locationId: string, startDate?: string, endDate?: string): Promise<HistoricalAnalysisResponse<any>> {
		try {
			const stats = await this.repository.getDataStatistics(locationId, startDate, endDate);

			// Calculate additional quality metrics
			const qualityMetrics = this.calculateQualityMetrics(stats);

			return {
				success: true,
				data: {
					...stats,
					quality: qualityMetrics
				},
				metadata: {
					calculatedAt: new Date().toISOString()
				}
			};

		} catch (error: any) {
			console.error('Historical Analysis: Statistics calculation failed:', error);

			return {
				success: false,
				error: error.message
			};
		}
	}

	/**
	 * Delete historical data with confirmation
	 */
	async deleteHistoricalData(
		locationId: string,
		startDate?: string,
		endDate?: string,
		confirm: boolean = false
	): Promise<HistoricalAnalysisResponse<{ deletedCount: number }>> {
		if (!confirm) {
			return {
				success: false,
				error: 'Deletion requires explicit confirmation. Set confirm=true to proceed.'
			};
		}

		try {
			const deletedCount = await this.repository.deleteHistoricalData(locationId, startDate, endDate);

			console.log(`Historical Analysis: Deleted ${deletedCount} records for location ${locationId}`);

			return {
				success: true,
				data: { deletedCount },
				metadata: {
					deletedAt: new Date().toISOString(),
					locationId,
					dateRange: { startDate, endDate }
				}
			};

		} catch (error: any) {
			console.error('Historical Analysis: Deletion failed:', error);

			return {
				success: false,
				error: error.message
			};
		}
	}

	/**
	 * Validate CSV file format before processing
	 */
	async validateCSVFormat(csvContent: string): Promise<HistoricalAnalysisResponse<{
		isValid: boolean;
		requiredColumns: string[];
		foundColumns: string[];
		metadata: Record<string, string>;
		estimatedRows: number;
	}>> {
		try {
			const parseResult = await this.repository.parseCSVContent(csvContent);

			const requiredColumns = ['timestamp', 'production (powerMw)', 'capacity_factor', 'availability'];
			const foundColumns = parseResult.headers;
			const hasAllRequired = requiredColumns.every(col => foundColumns.includes(col));

			return {
				success: true,
				data: {
					isValid: hasAllRequired && parseResult.errors.length === 0,
					requiredColumns,
					foundColumns,
					metadata: parseResult.metadata,
					estimatedRows: parseResult.dataRows.length
				},
				metadata: {
					validationErrors: parseResult.errors
				}
			};

		} catch (error: any) {
			return {
				success: false,
				error: error.message
			};
		}
	}

	/**
	 * Convert parsed CSV data to ProductionDataRow format
	 */
	private convertToProductionData(headers: string[], dataRows: string[][]): ProductionDataRow[] {
		const productionData: ProductionDataRow[] = [];

		// Get column indices
		const timestampIndex = headers.indexOf('timestamp');
		const productionIndex = headers.indexOf('production (powerMw)');
		const capacityFactorIndex = headers.indexOf('capacity_factor');
		const availabilityIndex = headers.indexOf('availability');

		for (const row of dataRows) {
			try {
				productionData.push({
					timestamp: row[timestampIndex]?.trim() || '',
					productionPowerMw: parseFloat(row[productionIndex] || '0') || 0,
					capacityFactor: parseFloat(row[capacityFactorIndex] || '0') || 0,
					availability: parseFloat(row[availabilityIndex] || '0') || 0
				});
			} catch (error) {
				// Skip invalid rows - they'll be caught in validation
				continue;
			}
		}

		return productionData;
	}

	/**
	 * Handle data replacement logic
	 */
	private async handleDataReplacement(locationId: string, productionData: ProductionDataRow[]): Promise<void> {
		if (productionData.length === 0) return;

		// Find the date range of the new data
		const timestamps = productionData
			.map(d => new Date(d.timestamp))
			.filter(d => !isNaN(d.getTime()))
			.sort((a, b) => a.getTime() - b.getTime());

		if (timestamps.length === 0) return;

		const startDate = timestamps[0].toISOString();
		const endDate = timestamps[timestamps.length - 1].toISOString();

		console.log(`Historical Analysis: Replacing data for location ${locationId} from ${startDate} to ${endDate}`);

		// Delete existing data in the range
		await this.repository.deleteHistoricalData(locationId, startDate, endDate);
	}

	/**
	 * Calculate data quality metrics
	 */
	private calculateQualityMetrics(stats: any): {
		completeness: number;
		reliability: number;
		overallScore: number;
		recommendations: string[];
	} {
		const totalRecords = Number(stats.total_records) || 0;
		const avgCapacityFactor = Number(stats.avg_capacity_factor) || 0;
		const avgAvailability = Number(stats.avg_availability) || 0;

		// Calculate completeness based on expected data points
		const expectedRecords = this.calculateExpectedRecords(stats.earliest_record, stats.latest_record);
		const completeness = expectedRecords > 0 ? Math.min(100, (totalRecords / expectedRecords) * 100) : 0;

		// Calculate reliability based on reasonable values
		const reliability = this.calculateReliabilityScore(avgCapacityFactor, avgAvailability);

		// Overall quality score
		const overallScore = (completeness * 0.6 + reliability * 0.4);

		// Generate recommendations
		const recommendations = this.generateQualityRecommendations(completeness, reliability, stats);

		return {
			completeness: Math.round(completeness * 10) / 10,
			reliability: Math.round(reliability * 10) / 10,
			overallScore: Math.round(overallScore * 10) / 10,
			recommendations
		};
	}

	/**
	 * Calculate expected number of records based on time range
	 */
	private calculateExpectedRecords(earliestRecord: string, latestRecord: string): number {
		if (!earliestRecord || !latestRecord) return 0;

		const start = new Date(earliestRecord);
		const end = new Date(latestRecord);
		const durationMs = end.getTime() - start.getTime();
		const durationHours = durationMs / (1000 * 60 * 60);

		// Assuming 15-minute intervals (4 records per hour)
		return Math.ceil(durationHours * 4);
	}

	/**
	 * Calculate reliability score based on data values
	 */
	private calculateReliabilityScore(avgCapacityFactor: number, avgAvailability: number): number {
		let score = 100;

		// Penalize unrealistic capacity factors
		if (avgCapacityFactor > 0.9 || avgCapacityFactor < 0.05) {
			score -= 20;
		}

		// Penalize low availability
		if (avgAvailability < 0.8) {
			score -= 15;
		}

		// Penalize perfect availability (suspicious)
		if (avgAvailability >= 0.999) {
			score -= 10;
		}

		return Math.max(0, score);
	}

	/**
	 * Generate quality improvement recommendations
	 */
	private generateQualityRecommendations(completeness: number, reliability: number, stats: any): string[] {
		const recommendations: string[] = [];

		if (completeness < 95) {
			recommendations.push(`Data completeness is ${completeness.toFixed(1)}%. Consider investigating missing data points.`);
		}

		if (reliability < 80) {
			recommendations.push(`Data reliability score is ${reliability.toFixed(1)}%. Review data validation and sensor calibration.`);
		}

		const avgCapacityFactor = Number(stats.avg_capacity_factor) || 0;
		if (avgCapacityFactor > 0.85) {
			recommendations.push('Very high capacity factor detected. Verify measurement accuracy and system performance.');
		}

		if (avgCapacityFactor < 0.10) {
			recommendations.push('Low capacity factor detected. Check for maintenance periods or system issues.');
		}

		const avgAvailability = Number(stats.avg_availability) || 0;
		if (avgAvailability < 0.85) {
			recommendations.push('Low system availability detected. Review maintenance schedules and fault records.');
		}

		if (recommendations.length === 0) {
			recommendations.push('Data quality metrics are within expected ranges.');
		}

		return recommendations;
	}
}