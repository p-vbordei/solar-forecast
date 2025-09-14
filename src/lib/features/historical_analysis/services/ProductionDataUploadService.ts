import { db } from '$lib/server/database.js';

export interface CSVUploadResult {
	totalRows: number;
	insertedRows: number;
	skippedRows: number;
	errors: string[];
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

export class ProductionDataUploadService {
	/**
	 * Parse CSV content and insert production data into the database
	 */
	async parseAndInsertCSV(csvContent: string, locationId: string): Promise<CSVUploadResult> {
		const result: CSVUploadResult = {
			totalRows: 0,
			insertedRows: 0,
			skippedRows: 0,
			errors: []
		};

		try {
			// Validate that location exists
			const locationExists = await db.location.findUnique({
				where: { id: locationId }
			});

			if (!locationExists) {
				throw new Error(`Location with ID ${locationId} not found`);
			}

			// Parse CSV content
			const lines = csvContent.split('\n').filter(line => line.trim());

			if (lines.length < 6) {
				throw new Error('CSV file must contain metadata rows, header row, and at least one data row');
			}

			// Find the data header row (contains 'timestamp')
			let dataHeaderIndex = -1;
			let headers: string[] = [];

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const columns = this.parseCSVLine(line);

				if (columns.includes('timestamp') && columns.includes('production (powerMw)')) {
					dataHeaderIndex = i;
					headers = columns;
					break;
				}
			}

			if (dataHeaderIndex === -1) {
				throw new Error('Could not find data header row with required columns: timestamp, production (powerMw), capacity_factor, availability');
			}

			// Validate headers
			const requiredColumns = ['timestamp', 'production (powerMw)', 'capacity_factor', 'availability'];
			const missingColumns = requiredColumns.filter(col => !headers.includes(col));

			if (missingColumns.length > 0) {
				throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
			}

			// Parse data rows
			const dataRows = lines.slice(dataHeaderIndex + 1);
			result.totalRows = dataRows.length;

			const productionDataToInsert: any[] = [];

			for (let i = 0; i < dataRows.length; i++) {
				try {
					const line = dataRows[i];
					if (!line.trim()) continue; // Skip empty lines

					const values = this.parseCSVLine(line);
					if (values.length !== headers.length) {
						result.errors.push(`Row ${i + dataHeaderIndex + 2}: Column count mismatch. Expected ${headers.length}, got ${values.length}`);
						result.skippedRows++;
						continue;
					}

					// Create row object
					const rowData: any = {};
					headers.forEach((header, index) => {
						rowData[header] = values[index];
					});

					// Validate and parse row data
					const parsedRow = this.validateAndParseRow(rowData, i + dataHeaderIndex + 2);
					if (parsedRow.isValid && parsedRow.data) {
						productionDataToInsert.push({
							id: crypto.randomUUID(),
							timestamp: new Date(parsedRow.data.timestamp),
							locationId: locationId,
							powerMW: parsedRow.data.productionPowerMw,
							capacityFactor: parsedRow.data.capacityFactor,
							availability: parsedRow.data.availability
						});
					} else {
						result.errors.push(...parsedRow.errors);
						result.skippedRows++;
					}

				} catch (error: any) {
					result.errors.push(`Row ${i + dataHeaderIndex + 2}: ${error.message}`);
					result.skippedRows++;
				}
			}

			// Batch insert into database
			if (productionDataToInsert.length > 0) {
				try {
					await db.production.createMany({
						data: productionDataToInsert,
						skipDuplicates: true
					});
					result.insertedRows = productionDataToInsert.length;
				} catch (dbError: any) {
					throw new Error(`Database insertion failed: ${dbError.message}`);
				}
			}

			return result;

		} catch (error: any) {
			throw new Error(`CSV processing failed: ${error.message}`);
		}
	}

	/**
	 * Parse a CSV line handling quoted values and commas within quotes
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
	 * Validate and parse a single data row
	 */
	private validateAndParseRow(rowData: any, rowNumber: number): { isValid: boolean; data?: ProductionDataRow; errors: string[] } {
		const errors: string[] = [];

		// Validate timestamp
		const timestamp = rowData.timestamp;
		if (!timestamp) {
			errors.push(`Row ${rowNumber}: Missing timestamp`);
		} else {
			const dateObj = new Date(timestamp);
			if (isNaN(dateObj.getTime())) {
				errors.push(`Row ${rowNumber}: Invalid timestamp format "${timestamp}". Use ISO format (YYYY-MM-DDTHH:MM:SS+TZ)`);
			}
		}

		// Validate production (powerMw)
		const production = rowData['production (powerMw)'];
		let productionPowerMw = 0;
		if (production === null || production === undefined || production === '') {
			errors.push(`Row ${rowNumber}: Missing production (powerMw) value`);
		} else {
			const prodNum = parseFloat(production);
			if (isNaN(prodNum)) {
				errors.push(`Row ${rowNumber}: Invalid production (powerMw) value "${production}". Must be a decimal number`);
			} else if (prodNum < 0) {
				errors.push(`Row ${rowNumber}: Production (powerMw) value cannot be negative`);
			} else {
				productionPowerMw = prodNum;
			}
		}

		// Validate capacity_factor
		const capacityFactor = rowData.capacity_factor;
		let capacityFactorValue = 0;
		if (capacityFactor === null || capacityFactor === undefined || capacityFactor === '') {
			errors.push(`Row ${rowNumber}: Missing capacity_factor value`);
		} else {
			const cfNum = parseFloat(capacityFactor);
			if (isNaN(cfNum)) {
				errors.push(`Row ${rowNumber}: Invalid capacity_factor value "${capacityFactor}". Must be a decimal number`);
			} else if (cfNum < 0 || cfNum > 1) {
				errors.push(`Row ${rowNumber}: Capacity factor must be between 0 and 1`);
			} else {
				capacityFactorValue = cfNum;
			}
		}

		// Validate availability
		const availability = rowData.availability;
		let availabilityValue = 0;
		if (availability === null || availability === undefined || availability === '') {
			errors.push(`Row ${rowNumber}: Missing availability value`);
		} else {
			const availNum = parseFloat(availability);
			if (isNaN(availNum)) {
				errors.push(`Row ${rowNumber}: Invalid availability value "${availability}". Must be a decimal number`);
			} else if (availNum < 0 || availNum > 1) {
				errors.push(`Row ${rowNumber}: Availability must be between 0 and 1`);
			} else {
				availabilityValue = availNum;
			}
		}

		if (errors.length === 0) {
			return {
				isValid: true,
				data: {
					timestamp,
					productionPowerMw,
					capacityFactor: capacityFactorValue,
					availability: availabilityValue
				},
				errors: []
			};
		} else {
			return {
				isValid: false,
				errors
			};
		}
	}

	/**
	 * Get historical production data for a location
	 */
	async getHistoricalData(query: HistoricalDataQuery) {
		try {
			// Validate that location exists
			const locationExists = await db.location.findUnique({
				where: { id: query.locationId }
			});

			if (!locationExists) {
				throw new Error(`Location with ID ${query.locationId} not found`);
			}

			// Build where clause
			const where: any = {
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

		} catch (error: any) {
			throw new Error(`Failed to retrieve historical data: ${error.message}`);
		}
	}
}