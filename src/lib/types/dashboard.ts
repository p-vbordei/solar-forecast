export interface DashboardMetrics {
  currentProduction: ProductionMetric;
  dailyEnergy: EnergyMetric;
  forecastAccuracy: AccuracyMetric;
}

export interface ProductionMetric {
  value: number;
  unit: 'MW' | 'kW';
  change: number;
  changeType: 'increase' | 'decrease';
  comparisonPeriod: 'vs yesterday' | 'vs last week' | 'vs last month';
}

export interface EnergyMetric {
  value: number;
  unit: 'MWh' | 'kWh';
  change: number;
  changeType: 'increase' | 'decrease';
  comparisonPeriod: 'vs yesterday' | 'vs last week' | 'vs last month';
}

export interface AccuracyMetric {
  value: number;
  unit: '%';
  change: number;
  changeType: 'increase' | 'decrease';
  comparisonPeriod: 'vs yesterday' | 'vs last week' | 'vs last month';
}

export interface WeatherParameter {
  id: string;
  name: string;
  value: number;
  unit: string;
  selected: boolean;
  color: string;
}

export interface WeatherData {
  timestamp: Date;
  solarRadiation: number; // W/m²
  temperature: number; // °C
  cloudCoverage: number; // %
  windSpeed: number; // m/s
  humidity: number; // %
}

export interface WeatherTimeSeriesData {
  parameters: WeatherParameter[];
  timeSeries: WeatherTimePoint[];
  currentValues: {
    solarRadiation: number;
    temperature: number;
    cloudCoverage: number;
    windSpeed: number;
    humidity: number;
  };
}

export interface WeatherTimePoint {
  timestamp: string;
  solarRadiation: number;
  temperature: number;
  cloudCoverage: number;
  windSpeed: number;
  humidity: number;
}

export interface LocationOption {
  id: number;
  name: string;
  city: string;
  isActive: boolean;
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardMetrics;
  locationId: number;
  locationName: string;
  timestamp: string;
}

export interface WeatherResponse {
  success: boolean;
  data: WeatherTimeSeriesData;
  locationId: number;
  locationName: string;
  timeRange: 'today' | 'tomorrow' | '7days';
}

export type TimeRange = 'today' | 'tomorrow' | '7days';
export type WeatherParameterType = 'solarRadiation' | 'temperature' | 'cloudCoverage' | 'windSpeed' | 'humidity';