import { DashboardRepository } from '../repositories/dashboard.repository';
import type { 
  DashboardMetrics, 
  ProductionMetric, 
  EnergyMetric, 
  AccuracyMetric,
  WeatherTimeSeriesData,
  WeatherParameter,
  WeatherTimePoint,
  LocationOption,
  TimeRange
} from '$lib/types/dashboard';

export class DashboardService {
  private repository = new DashboardRepository();

  /**
   * Get complete dashboard metrics for a location
   */
  async getDashboardMetrics(locationId: number): Promise<DashboardMetrics> {
    // Fetch all required data in parallel for performance
    const [
      currentProduction,
      yesterdayProduction,
      todayEnergy,
      yesterdayEnergy,
      currentAccuracy,
      yesterdayAccuracy
    ] = await Promise.all([
      this.repository.getCurrentProduction(locationId),
      this.repository.getYesterdayProduction(locationId),
      this.repository.getTodayEnergyProduction(locationId),
      this.repository.getYesterdayEnergyProduction(locationId),
      this.repository.getForecastAccuracy(locationId),
      this.repository.getYesterdayForecastAccuracy(locationId)
    ]);

    return {
      currentProduction: this.calculateProductionMetric(
        currentProduction?.current_power_mw || 0,
        yesterdayProduction
      ),
      dailyEnergy: this.calculateEnergyMetric(
        todayEnergy,
        yesterdayEnergy
      ),
      forecastAccuracy: this.calculateAccuracyMetric(
        currentAccuracy,
        yesterdayAccuracy
      )
    };
  }

  /**
   * Get weather time series data for dashboard visualization
   */
  async getWeatherData(locationId: number, timeRange: TimeRange): Promise<WeatherTimeSeriesData> {
    // Fetch time series and current weather in parallel
    const [timeSeriesData, currentWeather] = await Promise.all([
      this.repository.getWeatherTimeSeries(locationId, timeRange),
      this.repository.getCurrentWeather(locationId)
    ]);

    // Transform the time series data
    const timeSeries: WeatherTimePoint[] = timeSeriesData.map(point => ({
      timestamp: point.bucket,
      solarRadiation: Math.round(point.avg_ghi_w_m2 || 0),
      temperature: Math.round((point.avg_temperature_c || 0) * 10) / 10,
      cloudCoverage: Math.round(point.avg_cloud_coverage_percent || 0),
      windSpeed: Math.round((point.avg_wind_speed_ms || 0) * 10) / 10,
      humidity: Math.round(point.avg_humidity_percent || 0)
    }));

    // Define available weather parameters
    const parameters: WeatherParameter[] = [
      {
        id: 'solarRadiation',
        name: 'Solar Radiation',
        value: currentWeather?.ghi_w_m2 || 0,
        unit: 'W/m²',
        selected: true,
        color: '#FCD34D' // Yellow
      },
      {
        id: 'temperature',
        name: 'Temperature',
        value: currentWeather?.temperature_c || 0,
        unit: '°C',
        selected: true,
        color: '#EF4444' // Red
      },
      {
        id: 'cloudCoverage',
        name: 'Cloud Coverage',
        value: currentWeather?.cloud_coverage_percent || 0,
        unit: '%',
        selected: true,
        color: '#9CA3AF' // Gray
      },
      {
        id: 'windSpeed',
        name: 'Wind Speed',
        value: currentWeather?.wind_speed_ms || 0,
        unit: 'm/s',
        selected: false,
        color: '#10B981' // Green
      },
      {
        id: 'humidity',
        name: 'Humidity',
        value: currentWeather?.humidity_percent || 0,
        unit: '%',
        selected: false,
        color: '#3B82F6' // Blue
      }
    ];

    return {
      parameters,
      timeSeries,
      currentValues: {
        solarRadiation: Math.round(currentWeather?.ghi_w_m2 || 0),
        temperature: Math.round((currentWeather?.temperature_c || 0) * 10) / 10,
        cloudCoverage: Math.round(currentWeather?.cloud_coverage_percent || 0),
        windSpeed: Math.round((currentWeather?.wind_speed_ms || 0) * 10) / 10,
        humidity: Math.round(currentWeather?.humidity_percent || 0)
      }
    };
  }

  /**
   * Get available locations for dropdown selection
   */
  async getAvailableLocations(): Promise<LocationOption[]> {
    const locations = await this.repository.getActiveLocations();
    
    return locations.map(location => ({
      id: location.id,
      name: location.name,
      city: location.city,
      isActive: location.isActive
    }));
  }

  /**
   * Get location details by ID
   */
  async getLocationDetails(locationId: number) {
    return await this.repository.getLocationById(locationId);
  }

  /**
   * Calculate production metric with comparison
   */
  private calculateProductionMetric(current: number, yesterday: number): ProductionMetric {
    const change = yesterday > 0 ? ((current - yesterday) / yesterday) * 100 : 0;
    
    return {
      value: Math.round(current * 10) / 10,
      unit: 'MW',
      change: Math.round(Math.abs(change) * 10) / 10,
      changeType: change >= 0 ? 'increase' : 'decrease',
      comparisonPeriod: 'vs yesterday'
    };
  }

  /**
   * Calculate energy metric with comparison
   */
  private calculateEnergyMetric(today: number, yesterday: number): EnergyMetric {
    const change = yesterday > 0 ? ((today - yesterday) / yesterday) * 100 : 0;
    
    return {
      value: Math.round(today * 10) / 10,
      unit: 'MWh',
      change: Math.round(Math.abs(change) * 10) / 10,
      changeType: change >= 0 ? 'increase' : 'decrease',
      comparisonPeriod: 'vs yesterday'
    };
  }

  /**
   * Calculate accuracy metric with comparison
   */
  private calculateAccuracyMetric(current: number, yesterday: number): AccuracyMetric {
    const change = yesterday > 0 ? ((current - yesterday) / yesterday) * 100 : 0;
    
    return {
      value: Math.round(current * 10) / 10,
      unit: '%',
      change: Math.round(Math.abs(change) * 10) / 10,
      changeType: change >= 0 ? 'increase' : 'decrease',
      comparisonPeriod: 'vs yesterday'
    };
  }

  /**
   * Validate location access for user/client
   */
  async validateLocationAccess(locationId: number, clientId?: number): Promise<boolean> {
    const location = await this.repository.getLocationById(locationId);
    
    if (!location || !location.isActive) {
      return false;
    }

    // If clientId is provided, check if location belongs to client
    if (clientId) {
      const locationWithClient = await this.repository.getLocationById(locationId);
      // This would need to be expanded based on your multi-tenant structure
      return locationWithClient !== null;
    }

    return true;
  }
}