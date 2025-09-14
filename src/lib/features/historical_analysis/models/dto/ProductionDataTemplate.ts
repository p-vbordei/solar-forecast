export interface ProductionDataMetadata {
	location_name: string;
	location_guid: string;
	time_aggregation: '15min' | 'hourly' | 'daily' | 'monthly';
	start_date: string; // YYYY-MM-DD format
	end_date: string; // YYYY-MM-DD format
}

export interface ProductionDataRow {
	timestamp: string; // YYYY-MM-DD HH:MM:SS±HH:MM format
	production: number | null; // MWh or empty
	capacity_factor: number | null; // 0.0 - 1.0 or empty
	availability: number | null; // 0.0 - 1.0 or empty
}

export interface ProductionDataTemplate {
	metadata: ProductionDataMetadata;
	data: ProductionDataRow[];
}

export interface ProductionDataTemplateConfig {
	location_name?: string;
	location_guid?: string;
	time_aggregation?: '15min' | 'hourly' | 'daily' | 'monthly';
	start_date: string;
	end_date: string;
	timezone?: string; // e.g., '+03:00'
}