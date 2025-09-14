import type {
	ProductionDataTemplate,
	ProductionDataTemplateConfig,
	ProductionDataRow,
	ProductionDataMetadata
} from '../models/dto/ProductionDataTemplate.js';

export class ProductionDataTemplateService {
	generateTemplate(config: ProductionDataTemplateConfig): ProductionDataTemplate {
		const metadata = this.createMetadata(config);
		const data = this.generateDataRows(config);

		return {
			metadata,
			data
		};
	}

	generateCSV(config: ProductionDataTemplateConfig): string {
		const template = this.generateTemplate(config);
		return this.convertToCSV(template);
	}

	private createMetadata(config: ProductionDataTemplateConfig): ProductionDataMetadata {
		return {
			location_name: config.location_name || 'Solar Farm Site A',
			location_guid: config.location_guid || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
			time_aggregation: config.time_aggregation || 'hourly',
			start_date: config.start_date,
			end_date: config.end_date
		};
	}

	private generateDataRows(config: ProductionDataTemplateConfig): ProductionDataRow[] {
		const startDate = new Date(config.start_date);
		const endDate = new Date(config.end_date);
		const timezone = config.timezone || '+03:00';
		const aggregation = config.time_aggregation || 'hourly';

		// Pre-calculate total rows to allocate array efficiently
		const totalRows = this.calculateTotalRows(startDate, endDate, aggregation);
		const rows: ProductionDataRow[] = new Array(totalRows);

		// Optimized timestamp generation using milliseconds
		const startMs = startDate.getTime();
		const endMs = endDate.getTime();

		let index = 0;

		if (aggregation === '15min') {
			// Process 15-minute intervals - 96 intervals per day (24 * 4)
			for (let ms = startMs; ms <= endMs; ms += 24 * 60 * 60 * 1000) { // Add 1 day
				const date = new Date(ms);
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');

				for (let interval = 0; interval < 96 && index < totalRows; interval++) {
					const hour = Math.floor(interval / 4);
					const minute = (interval % 4) * 15;

					rows[index++] = {
						timestamp: `${year}-${month}-${day} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00${timezone}`,
						production: null,
						capacity_factor: null,
						availability: null
					};
				}
			}
		} else if (aggregation === 'hourly') {
			// Process one hour at a time using milliseconds
			for (let ms = startMs; ms <= endMs; ms += 24 * 60 * 60 * 1000) { // Add 1 day
				const date = new Date(ms);
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');

				for (let hour = 0; hour < 24 && index < totalRows; hour++) {
					rows[index++] = {
						timestamp: `${year}-${month}-${day} ${String(hour).padStart(2, '0')}:00:00${timezone}`,
						production: null,
						capacity_factor: null,
						availability: null
					};
				}
			}
		} else if (aggregation === 'daily') {
			// Process one day at a time
			for (let ms = startMs; ms <= endMs; ms += 24 * 60 * 60 * 1000) { // Add 1 day
				const date = new Date(ms);
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');

				rows[index++] = {
					timestamp: `${year}-${month}-${day} 12:00:00${timezone}`,
					production: null,
					capacity_factor: null,
					availability: null
				};
			}
		} else if (aggregation === 'monthly') {
			// Process one month at a time
			let currentDate = new Date(startDate);
			while (currentDate <= endDate && index < totalRows) {
				const year = currentDate.getFullYear();
				const month = String(currentDate.getMonth() + 1).padStart(2, '0');

				rows[index++] = {
					timestamp: `${year}-${month}-15 12:00:00${timezone}`,
					production: null,
					capacity_factor: null,
					availability: null
				};

				currentDate.setMonth(currentDate.getMonth() + 1);
			}
		}

		// Return only filled portion of array if we allocated too much
		return rows.slice(0, index);
	}

	private calculateTotalRows(startDate: Date, endDate: Date, aggregation: string): number {
		const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

		switch (aggregation) {
			case '15min':
				return daysDiff * 96; // 96 intervals per day (24 * 4)
			case 'hourly':
				return daysDiff * 24;
			case 'daily':
				return daysDiff;
			case 'monthly':
				// Approximate months - will be accurate after processing
				return Math.ceil(daysDiff / 30) + 1;
			default:
				return daysDiff;
		}
	}

	private formatTimestamp(date: Date, hour: number, timezoneOffset: string): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hourStr = String(hour).padStart(2, '0');

		return `${year}-${month}-${day} ${hourStr}:00:00${timezoneOffset}`;
	}
	
	private convertToCSV(template: ProductionDataTemplate): string {
		// Use array pre-allocation and direct string building for better performance
		const totalRows = template.data.length + 6; // 5 metadata rows + 1 header
		const lines: string[] = new Array(totalRows);

		// Add metadata rows
		lines[0] = `location_name,${template.metadata.location_name}`;
		lines[1] = `location_guid,${template.metadata.location_guid}`;
		lines[2] = `time_aggregation,${template.metadata.time_aggregation}`;
		lines[3] = `start_date,${template.metadata.start_date}`;
		lines[4] = `end_date,${template.metadata.end_date}`;
		lines[5] = 'timestamp,production (powerMw),capacity_factor,availability';

		// Add data rows - optimized loop with direct assignment
		for (let i = 0; i < template.data.length; i++) {
			const row = template.data[i];
			lines[i + 6] = `${row.timestamp},,,`; // All values are null, so just use empty strings
		}

		return lines.join('\n');
	}
}