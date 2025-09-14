import { db, TimescaleQueries } from '$lib/server/database';
import type { Prisma } from '@prisma/client';

export interface CSVUploadResult {
	totalRows: number;
	insertedRows: number;
	skippedRows: number;
	errors: string[];
	processingTimeMs: number;
}

export interface ProductionDataRow {
	timestamp: string;
	productionPowerMw: number;
	capacityFactor: number;
	availability: number;
}

export interface HistoricalDataQuery {
	locationId: string;
	startDate?: string;
	endDate?: string;
	limit?: number;
	offset?: number;
}

export interface BulkInsertOptions {
	batchSize?: number;
	validateTimestamps?: boolean;
	skipDuplicates?: boolean;
	onConflict?: 'ignore' | 'update';
}

/**
 * Repository for Historical Analysis with TimescaleDB optimization
 * Handles CSV parsing, validation, and bulk insertion of production data
 */
export class HistoricalAnalysisRepository {

	/**
	 * Bulk insert production data using TimescaleDB optimization
	 */
	async bulkInsertProductionData(
		data: ProductionDataRow[],
		locationId: string,
		options: BulkInsertOptions = {}
	): Promise<CSVUploadResult> {
		const startTime = Date.now();
		const result: CSVUploadResult = {
			totalRows: data.length,
			insertedRows: 0,
			skippedRows: 0,
			errors: [],
			processingTimeMs: 0
		};

		try {
			// Validate location exists
			await this.validateLocation(locationId);

			// Prepare data for bulk insertion
			const productionDataToInsert = await this.prepareProductionData(
				data,
				locationId,
				result
			);

			if (productionDataToInsert.length === 0) {
				result.processingTimeMs = Date.now() - startTime;
				return result;
			}

			// Use TimescaleDB optimized bulk insert
			const insertResult = await TimescaleQueries.bulkInsert(
				'production',
				productionDataToInsert,
				{
					batchSize: options.batchSize || 1000,
					onConflict: options.onConflict || 'ignore',
					validateTimestamps: options.validateTimestamps || true
				}
			);

			result.insertedRows = insertResult.inserted;
			result.processingTimeMs = Date.now() - startTime;

			console.log(`Historical Analysis: Bulk inserted ${result.insertedRows} production records in ${result.processingTimeMs}ms`);

			return result;

		} catch (error: any) {
			result.errors.push(`Bulk insertion failed: ${error.message}`);
			result.processingTimeMs = Date.now() - startTime;
			throw error;
		}
	}

	/**
	 * Parse CSV content and validate data structure
	 */
	async parseCSVContent(csvContent: string): Promise<{
		headers: string[];
		dataRows: string[][];
		metadata: Record<string, string>;
		errors: string[];
	}> {
		const errors: string[] = [];
		const lines = csvContent.split('\n').filter(line => line.trim());

		if (lines.length < 6) {
			throw new Error('CSV file must contain metadata rows, header row, and at least one data row');
		}

		// Parse metadata (first few rows before data header)
		const metadata: Record<string, string> = {};
		let dataHeaderIndex = -1;
		let headers: string[] = [];

		// Look for metadata rows and data header
		for (let i = 0; i < Math.min(10, lines.length); i++) {
			const line = lines[i];
			const columns = this.parseCSVLine(line);

			// Check if this is a metadata row (key: value format)
			if (columns.length === 2 && !columns[0].includes('timestamp')) {
				metadata[columns[0].trim()] = columns[1].trim();
			}

			// Check if this is the data header row
			if (columns.includes('timestamp') && columns.includes('production (powerMw)')) {
				dataHeaderIndex = i;
				headers = columns;
				break;
			}
		}

		if (dataHeaderIndex === -1) {
			throw new Error('Could not find data header row with required columns: timestamp, production (powerMw), capacity_factor, availability');
		}

		// Validate required columns
		const requiredColumns = ['timestamp', 'production (powerMw)', 'capacity_factor', 'availability'];
		const missingColumns = requiredColumns.filter(col => !headers.includes(col));

		if (missingColumns.length > 0) {
			throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
		}

		// Parse data rows
		const dataRows: string[][] = [];
		const dataLines = lines.slice(dataHeaderIndex + 1);

		for (let i = 0; i < dataLines.length; i++) {
			const line = dataLines[i];
			if (!line.trim()) continue;

			const values = this.parseCSVLine(line);
			if (values.length !== headers.length) {
				errors.push(`Row ${i + dataHeaderIndex + 2}: Column count mismatch. Expected ${headers.length}, got ${values.length}`);
				continue;
			}

			dataRows.push(values);
		}

		return { headers, dataRows, metadata, errors };
	}

	/**
	 * Get historical production data with pagination
	 */
	async getHistoricalData(query: HistoricalDataQuery) {
		try {
			// Validate location exists
			await this.validateLocation(query.locationId);

			// Use TimescaleDB optimized query for time-series data
			const timeInterval = this.determineOptimalInterval(query.startDate, query.endDate);

			// If requesting a short time period, use raw data
			if (timeInterval === 'raw') {
				return this.getRawHistoricalData(query);
			}

			// Use TimescaleDB time bucket aggregation for efficiency
			const aggregatedData = await TimescaleQueries.timeBucket({
				interval: timeInterval,
				table: 'production',
				aggregations: {
					avg: ['power_mw', 'capacity_factor', 'availability'],
					max: ['power_mw'],
					min: ['power_mw'],
					count: ['*']
				},
				where: this.buildTimeseriesWhereClause(query),
				groupBy: ['location_id'],
				limit: query.limit || 1000
			});

			// Get location metadata
			const location = await db.location.findUnique({
				where: { id: query.locationId },
				select: {
					id: true,
					name: true,
					code: true,
					capacityMW: true
				}
			});

			return {
				success: true,
				data: aggregatedData.map(row => ({
					id: crypto.randomUUID(),
					timestamp: row.bucket_time,
					locationId: query.locationId,
					powerMW: Number(row.avg_power_mw) || 0,
					capacityFactor: Number(row.avg_capacity_factor) || 0,
					availability: Number(row.avg_availability) || 0,
					location: location
				})),
				metadata: {
					aggregationType: timeInterval,
					totalRecords: aggregatedData.length,
					location: location,
					query: query
				}
			};

		} catch (error: any) {
			throw new Error(`Failed to retrieve historical data: ${error.message}`);
		}
	}

	/**
	 * Get raw (non-aggregated) historical data for short time periods
	 */
	private async getRawHistoricalData(query: HistoricalDataQuery) {
		// Build where clause
		const where: Prisma.ProductionWhereInput = {
			locationId: query.locationId
		};

		// Add date filters if provided
		if (query.startDate || query.endDate) {
			where.timestamp = {};
			if (query.startDate) {
				where.timestamp.gte = new Date(query.startDate);
			}
			if (query.endDate) {
				where.timestamp.lte = new Date(query.endDate);
			}
		}

		// Get total count
		const totalCount = await db.production.count({ where });

		// Get the data with pagination
		const productionData = await db.production.findMany({
			where,
			orderBy: {
				timestamp: 'desc'
			},
			take: query.limit || 1000,
			skip: query.offset || 0,
			include: {
				location: {
					select: {
						id: true,
						name: true,
						code: true,
						capacityMW: true
					}
				}
			}
		});

		return {
			success: true,
			data: productionData,
			pagination: {
				total: totalCount,
				limit: query.limit || 1000,
				offset: query.offset || 0,
				hasMore: (query.offset || 0) + (query.limit || 1000) < totalCount
			}
		};
	}

	/**
	 * Validate location exists and is accessible
	 */
	private async validateLocation(locationId: string): Promise<void> {
		const location = await db.location.findUnique({
			where: { id: locationId },
			select: { id: true, status: true }
		});

		if (!location) {
			throw new Error(`Location with ID ${locationId} not found`);
		}

		if (location.status !== 'ACTIVE') {
			throw new Error(`Location ${locationId} is not active`);
		}
	}

	/**
	 * Prepare production data for bulk insertion with validation
	 */
	private async prepareProductionData(
		data: ProductionDataRow[],
		locationId: string,
		result: CSVUploadResult
	): Promise<Prisma.ProductionCreateManyInput[]> {
		const productionDataToInsert: Prisma.ProductionCreateManyInput[] = [];

		for (let i = 0; i < data.length; i++) {
			try {
				const row = data[i];
				const validationResult = this.validateProductionRow(row, i + 1);

				if (validationResult.isValid && validationResult.data) {
					productionDataToInsert.push({
						id: crypto.randomUUID(),
						timestamp: new Date(validationResult.data.timestamp),
						locationId: locationId,
						powerMW: validationResult.data.productionPowerMw,
						capacityFactor: validationResult.data.capacityFactor,
						availability: validationResult.data.availability
					});
				} else {
					result.errors.push(...validationResult.errors);
					result.skippedRows++;
				}

			} catch (error: any) {
				result.errors.push(`Row ${i + 1}: ${error.message}`);
				result.skippedRows++;
			}
		}

		// Sort by timestamp for optimal TimescaleDB insertion
		productionDataToInsert.sort((a, b) =>
			new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
		);

		return productionDataToInsert;
	}

	/**
	 * Parse CSV line handling quoted values and commas within quotes
	 */
	private parseCSVLine(line: string): string[] {
		const result: string[] = [];
		let current = '';
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];

			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === ',' && !inQuotes) {
				result.push(current.trim());
				current = '';
			} else {
				current += char;
			}
		}

		result.push(current.trim());
		return result;
	}

	/**
	 * Validate a single production data row
	 */
	private validateProductionRow(row: ProductionDataRow, rowNumber: number): {
		isValid: boolean;
		data?: ProductionDataRow;
		errors: string[];
	} {
		const errors: string[] = [];

		// Validate timestamp
		if (!row.timestamp) {
			errors.push(`Row ${rowNumber}: Missing timestamp`);
		} else {
			const dateObj = new Date(row.timestamp);
			if (isNaN(dateObj.getTime())) {
				errors.push(`Row ${rowNumber}: Invalid timestamp format "${row.timestamp}". Use ISO format (YYYY-MM-DDTHH:MM:SS+TZ)`);
			}
		}

		// Validate production power
		if (row.productionPowerMw === null || row.productionPowerMw === undefined) {
			errors.push(`Row ${rowNumber}: Missing production power value`);
		} else if (isNaN(row.productionPowerMw) || row.productionPowerMw < 0) {
			errors.push(`Row ${rowNumber}: Invalid production power value "${row.productionPowerMw}". Must be a non-negative number`);
		}

		// Validate capacity factor
		if (row.capacityFactor === null || row.capacityFactor === undefined) {
			errors.push(`Row ${rowNumber}: Missing capacity factor value`);
		} else if (isNaN(row.capacityFactor) || row.capacityFactor < 0 || row.capacityFactor > 1) {
			errors.push(`Row ${rowNumber}: Capacity factor must be between 0 and 1, got ${row.capacityFactor}`);
		}

		// Validate availability
		if (row.availability === null || row.availability === undefined) {
			errors.push(`Row ${rowNumber}: Missing availability value`);
		} else if (isNaN(row.availability) || row.availability < 0 || row.availability > 1) {
			errors.push(`Row ${rowNumber}: Availability must be between 0 and 1, got ${row.availability}`);
		}

		return {
			isValid: errors.length === 0,
			data: errors.length === 0 ? row : undefined,
			errors
		};
	}

	/**
	 * Determine optimal aggregation interval based on date range
	 */
	private determineOptimalInterval(startDate?: string, endDate?: string): string {
		if (!startDate || !endDate) {
			return '1 hour'; // Default to hourly for undefined ranges
		}

		const start = new Date(startDate);
		const end = new Date(endDate);
		const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

		if (daysDiff <= 2) return 'raw'; // Raw data for very short periods
		if (daysDiff <= 7) return '15 minutes'; // 15-minute intervals for a week
		if (daysDiff <= 30) return '1 hour'; // Hourly for a month
		if (daysDiff <= 90) return '6 hours'; // 6-hour intervals for 3 months
		if (daysDiff <= 365) return '1 day'; // Daily for a year
		return '1 week'; // Weekly for longer periods
	}

	/**
	 * Build optimized WHERE clause for TimescaleDB time-series queries
	 */
	private buildTimeseriesWhereClause(query: HistoricalDataQuery): string {
		const conditions: string[] = [`location_id = '${query.locationId}'`];

		if (query.startDate) {
			conditions.push(`timestamp >= '${query.startDate}'`);
		}

		if (query.endDate) {
			conditions.push(`timestamp <= '${query.endDate}'`);
		}

		return conditions.join(' AND ');
	}

	/**
	 * Delete historical data for a location within a date range
	 */
	async deleteHistoricalData(locationId: string, startDate?: string, endDate?: string): Promise<number> {
		await this.validateLocation(locationId);

		const where: Prisma.ProductionWhereInput = {
			locationId: locationId
		};

		if (startDate || endDate) {
			where.timestamp = {};
			if (startDate) {
				where.timestamp.gte = new Date(startDate);
			}
			if (endDate) {
				where.timestamp.lte = new Date(endDate);
			}
		}

		const deleteResult = await db.production.deleteMany({ where });

		console.log(`Historical Analysis: Deleted ${deleteResult.count} production records for location ${locationId}`);

		return deleteResult.count;
	}

	/**
	 * Get data statistics for a location
	 */
	async getDataStatistics(locationId: string, startDate?: string, endDate?: string) {
		await this.validateLocation(locationId);

		const where = this.buildTimeseriesWhereClause({
			locationId,
			startDate,
			endDate
		});

		// Use raw SQL for complex aggregations
		const stats = await db.$queryRawUnsafe(`
			SELECT
				COUNT(*) as total_records,
				MIN(timestamp) as earliest_record,
				MAX(timestamp) as latest_record,
				AVG(power_mw) as avg_power_mw,
				MAX(power_mw) as peak_power_mw,
				AVG(capacity_factor) as avg_capacity_factor,
				AVG(availability) as avg_availability,
				SUM(power_mw * 0.25) as total_energy_mwh
			FROM production
			WHERE ${where}
		`);

		return stats[0];
	}
}