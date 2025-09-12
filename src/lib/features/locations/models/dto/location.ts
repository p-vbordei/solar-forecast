// Core Location Interface - Industry Standard Technical Parameters
export interface Location {
	id: string;
	clientId: string;
	name: string;
	
	// Mandatory Fields
	latitude: number;  // GPS coordinate
	longitude: number; // GPS coordinate
	
	// Client Information
	client: {
		name: string;
		id: string;
		contact_email: string;
		secondary_emails?: string[];
	};
	
	// Location Information
	location: {
		latitude: number;
		longitude: number;
		timezone: string;
		altitude: number;
		address?: string;
		city?: string;
		country?: string;
	};
	
	// Plant Specifications
	plant: {
		capacity_mw: number;
		capacity_kw: number;
		
		// Panel specifications
		panels: {
			tilt: number;                    // degrees from horizontal
			azimuth: number;                 // degrees (0=north, 180=south)
			technology: 'monocrystalline' | 'polycrystalline' | 'thin_film';
			temperature_coefficient: number; // per degree C
			nominal_efficiency: number;      // at STC
			bifacial: boolean;
			bifaciality_factor: number;     // if bifacial
			panel_count?: number;
			panel_wattage?: number;
		};
		
		// Inverter specifications
		inverter: {
			model: string;
			efficiency_curve: {
				[loadPercent: number]: number; // % load: efficiency
			};
			power_factor: number;
			inverter_count?: number;
			inverter_capacity_kw?: number;
		};
		
		// Mounting structure
		mounting: {
			type: 'fixed' | 'single_axis' | 'dual_axis';
			ground_coverage_ratio: number;  // for shading calculations
			row_spacing: number;            // meters, if applicable
			tracker_azimuth_limit?: number;
			tracker_elevation_limit?: number;
		};
		
		// System losses
		losses: {
			// Monthly soiling losses (Jan-Dec)
			soiling_monthly: number[]; // 12 values
			
			// Fixed losses
			shading: number;           // from nearby objects
			snow: number;              // annual average
			mismatch: number;          // module mismatch
			wiring_dc: number;         // DC wiring losses
			wiring_ac: number;         // AC wiring losses
			transformer: number;       // if applicable
			availability: number;      // system downtime
		};
	};
	
	// Performance Parameters
	performance: {
		// Weather-dependent performance ratios
		clear_sky: number;
		partly_cloudy: number;
		cloudy: number;
		overcast: number;
		
		// Enhancement parameters
		dawn_dusk_factor: number;  // Performance during low sun angles
		
		// Horizon shading (degrees above horizon)
		horizon_shading: {
			north: number;
			east: number;
			south: number;
			west: number;
			northeast: number;
			southeast: number;
			southwest: number;
			northwest: number;
		};
		
		// Temperature derating
		temperature_model: 'sapm' | 'simple' | 'faiman';
	};
	
	// Output Configuration
	output: {
		formats: string[];           // Output formats to generate
		email_reports: boolean;      // Email reports
		email_schedule: 'hourly' | 'daily' | 'custom';
		email_time: string;          // Local time for daily reports
		destination_path?: string;   // File paths
		archive_path?: string;
		api_endpoint?: string;       // API endpoint (if applicable)
		api_key?: string;
	};
	
	// Calibration Settings
	calibration: {
		adjustment_factor: number;   // Manual adjustment factors (1.0 = no adjustment)
		seasonal_adjustments: number[]; // Monthly factors (Jan-Dec)
		auto_calibrate: boolean;     // Auto-calibration settings
		calibration_frequency: 'daily' | 'weekly' | 'monthly';
		min_data_days: number;
		last_calibrated?: string | null;
		last_rmse?: number | null;
		last_bias?: number | null;
	};
	
	// Monitoring & Alerts
	monitoring?: {
		alert_thresholds: {
			forecast_error_percent: number;
			availability_percent: number;
		};
		track_performance: boolean;
		performance_metrics: string[];
		custom_alerts: any[];
	};
	
	// System fields
	status: 'active' | 'maintenance' | 'offline' | 'commissioning';
	installation_date?: Date;
	last_maintenance?: Date | null;
	createdAt: Date;
	updatedAt: Date;
	version: number; // For versioning support
	
	// Calculated fields (computed at runtime)
	efficiency?: number;
	healthScore?: number;
	currentOutput?: number;
	todayEnergy?: number;
	
	// Additional metadata
	notes?: string[];
	tags?: string[];
	certification_data?: {
		standards: string[];
		certificates: string[];
		grid_connection_approval?: Date;
	};
}

// Simplified Location Input for Creation/Updates
export interface LocationCreateInput {
	// Mandatory fields
	name: string;
	latitude: number;  // Required
	longitude: number; // Required
	
	// Client information (optional - defaults provided)
	client?: {
		name?: string;
		id?: string;
		contact_email?: string;
		secondary_emails?: string[];
	};
	
	// Location details (optional - smart defaults)
	location?: {
		timezone?: string;      // Default: auto-detect from GPS
		altitude?: number;      // Default: 0
		address?: string;
		city?: string;
		country?: string;
	};
	
	// Plant specifications (optional - industry defaults)
	plant?: {
		capacity_mw?: number;   // Default: 1.0
		
		panels?: {
			tilt?: number;                    // Default: latitude-optimized
			azimuth?: number;                 // Default: 180 (south)
			technology?: 'monocrystalline' | 'polycrystalline' | 'thin_film'; // Default: monocrystalline
			temperature_coefficient?: number; // Default: -0.004
			nominal_efficiency?: number;      // Default: 0.20
			bifacial?: boolean;              // Default: false
			bifaciality_factor?: number;     // Default: 0.0
		};
		
		inverter?: {
			model?: string;                  // Default: "Generic 3-phase"
			efficiency_curve?: { [key: number]: number };
			power_factor?: number;           // Default: 1.0
		};
		
		mounting?: {
			type?: 'fixed' | 'single_axis' | 'dual_axis'; // Default: fixed
			ground_coverage_ratio?: number;  // Default: 0.4
			row_spacing?: number;           // Default: 0
		};
		
		losses?: {
			soiling_monthly?: number[];     // Default: seasonal pattern
			shading?: number;              // Default: 0.01
			snow?: number;                 // Default: 0.00
			mismatch?: number;             // Default: 0.02
			wiring_dc?: number;            // Default: 0.015
			wiring_ac?: number;            // Default: 0.01
			transformer?: number;          // Default: 0.01
			availability?: number;         // Default: 0.02
		};
	};
	
	// Performance parameters (optional - weather-optimized defaults)
	performance?: {
		clear_sky?: number;        // Default: 0.95
		partly_cloudy?: number;    // Default: 0.88
		cloudy?: number;           // Default: 0.82
		overcast?: number;         // Default: 0.75
		dawn_dusk_factor?: number; // Default: 0.85
		horizon_shading?: {
			north?: number; east?: number; south?: number; west?: number;
			northeast?: number; southeast?: number; southwest?: number; northwest?: number;
		};
		temperature_model?: 'sapm' | 'simple' | 'faiman'; // Default: sapm
	};
	
	// Output configuration (optional - standard defaults)
	output?: {
		formats?: string[];           // Default: ['csv_15min', 'csv_hourly', 'json_api']
		email_reports?: boolean;      // Default: true
		email_schedule?: 'hourly' | 'daily' | 'custom'; // Default: daily
		email_time?: string;          // Default: '06:00'
	};
	
	// Calibration settings (optional - conservative defaults)
	calibration?: {
		adjustment_factor?: number;      // Default: 1.0
		seasonal_adjustments?: number[]; // Default: [1.0, 1.0, ...]
		auto_calibrate?: boolean;        // Default: false
		calibration_frequency?: 'daily' | 'weekly' | 'monthly'; // Default: monthly
		min_data_days?: number;          // Default: 30
	};
	
	// System status
	status?: 'active' | 'maintenance' | 'offline' | 'commissioning';
	installation_date?: string | Date;
	notes?: string[];
	tags?: string[];
}

// Location Update Input (for editing existing locations)
export interface LocationUpdateInput extends Partial<LocationCreateInput> {
	id: string;
	version?: number; // For optimistic locking
}

// Location Filter Options
export interface LocationFilter {
	clientId?: string;
	status?: 'active' | 'maintenance' | 'offline' | 'commissioning';
	minCapacity?: number;
	maxCapacity?: number;
	technology?: 'monocrystalline' | 'polycrystalline' | 'thin_film';
	mountingType?: 'fixed' | 'single_axis' | 'dual_axis';
	country?: string;
	tags?: string[];
	hasAlerts?: boolean;
	search?: string; // Search in name, city, notes
}

// Location Summary for List Views
export interface LocationSummary {
	id: string;
	name: string;
	city?: string;
	capacity_mw: number;
	latitude: number;
	longitude: number;
	status: string;
	currentOutput?: number;
	todayEnergy?: number;
	efficiency?: number;
	healthScore?: number;
	alertCount?: number;
	lastUpdate: Date;
}

// Technical Details View (for expanded display)
export interface LocationTechnicalDetails {
	id: string;
	plant: Location['plant'];
	performance: Location['performance'];
	calibration: Location['calibration'];
	output: Location['output'];
	monitoring?: Location['monitoring'];
	installation_date?: Date;
	version: number;
	lastCalibrated?: Date;
	notes?: string[];
}

// Default values for location creation
export const LOCATION_DEFAULTS = {
	plant: {
		capacity_mw: 1.0,
		panels: {
			tilt: 30,           // Will be optimized to latitude
			azimuth: 180,       // South-facing
			technology: 'monocrystalline' as const,
			temperature_coefficient: -0.004,
			nominal_efficiency: 0.20,
			bifacial: false,
			bifaciality_factor: 0.0
		},
		inverter: {
			model: 'Generic 3-phase inverter',
			efficiency_curve: {
				10: 0.95,
				25: 0.97,
				50: 0.98,
				75: 0.98,
				100: 0.975
			},
			power_factor: 1.0
		},
		mounting: {
			type: 'fixed' as const,
			ground_coverage_ratio: 0.4,
			row_spacing: 0
		},
		losses: {
			soiling_monthly: [0.04, 0.04, 0.03, 0.03, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.04, 0.04],
			shading: 0.01,
			snow: 0.00,
			mismatch: 0.02,
			wiring_dc: 0.015,
			wiring_ac: 0.01,
			transformer: 0.01,
			availability: 0.02
		}
	},
	performance: {
		clear_sky: 0.95,
		partly_cloudy: 0.88,
		cloudy: 0.82,
		overcast: 0.75,
		dawn_dusk_factor: 0.85,
		horizon_shading: {
			north: 0, east: 0, south: 0, west: 0,
			northeast: 0, southeast: 0, southwest: 0, northwest: 0
		},
		temperature_model: 'sapm' as const
	},
	output: {
		formats: ['csv_15min', 'csv_hourly', 'json_api'],
		email_reports: true,
		email_schedule: 'daily' as const,
		email_time: '06:00'
	},
	calibration: {
		adjustment_factor: 1.0,
		seasonal_adjustments: Array(12).fill(1.0),
		auto_calibrate: false,
		calibration_frequency: 'monthly' as const,
		min_data_days: 30
	},
	location: {
		timezone: 'UTC',
		altitude: 0
	}
};

// Helper function to get optimal tilt based on latitude
export function getOptimalTilt(latitude: number): number {
	return Math.abs(latitude);
}

// Helper function to detect timezone from GPS coordinates
export function detectTimezone(latitude: number, longitude: number): string {
	// Simplified timezone detection - in production, use a proper timezone library
	if (longitude >= -7.5 && longitude < 7.5) return 'UTC';
	if (longitude >= 7.5 && longitude < 22.5) return 'Europe/Berlin';
	if (longitude >= 22.5 && longitude < 37.5) return 'Europe/Bucharest';
	if (longitude >= -97.5 && longitude < -82.5) return 'America/Chicago';
	if (longitude >= -82.5 && longitude < -67.5) return 'America/New_York';
	// Add more timezone mappings as needed
	return 'UTC';
}