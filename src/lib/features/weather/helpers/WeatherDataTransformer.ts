import type { WeatherData } from '../models/dto/weather.ts';
import type { DataQuality } from '@prisma/client';

/**
 * Open-Meteo API Response Interface
 */
export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: {
    time: string;
    temperature_2m: string;
    relative_humidity_2m: string;
    pressure_msl: string;
    cloud_cover: string;
    wind_speed_10m: string;
    wind_direction_10m: string;
    shortwave_radiation?: string;
    direct_normal_irradiance?: string;
    diffuse_radiation?: string;
    terrestrial_radiation?: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    pressure_msl: number[];
    cloud_cover: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    shortwave_radiation?: number[];
    direct_normal_irradiance?: number[];
    diffuse_radiation?: number[];
    terrestrial_radiation?: number[];
  };
}

/**
 * Weather Data Transformer for Open-Meteo API
 */
export class WeatherDataTransformer {

  /**
   * Transform Open-Meteo response to WeatherData array
   */
  static transform(
    response: OpenMeteoResponse,
    locationId: string
  ): WeatherData[] {
    const weatherData: WeatherData[] = [];

    if (!response.hourly || !response.hourly.time) {
      throw new Error('Invalid Open-Meteo response: missing hourly data');
    }

    const timeArray = response.hourly.time;
    const length = timeArray.length;

    for (let i = 0; i < length; i++) {
      const timestamp = new Date(timeArray[i]);

      // Skip invalid timestamps
      if (isNaN(timestamp.getTime())) {
        continue;
      }

      const weatherRecord: WeatherData = {
        id: crypto.randomUUID(), // Generate GUID
        timestamp,
        time: timestamp, // Legacy compatibility
        locationId,

        // Basic weather metrics
        temperature: this.safeGetValue(response.hourly.temperature_2m, i, 0),
        humidity: this.safeGetValue(response.hourly.relative_humidity_2m, i, 50),
        pressure: this.safeGetValue(response.hourly.pressure_msl, i, 1013.25),
        windSpeed: this.safeGetValue(response.hourly.wind_speed_10m, i, 0),
        windDirection: this.safeGetValue(response.hourly.wind_direction_10m, i, 0),
        cloudCover: this.safeGetValue(response.hourly.cloud_cover, i, 0),

        // Solar radiation components (from Open-Meteo)
        ghi: response.hourly.shortwave_radiation
          ? this.safeGetValue(response.hourly.shortwave_radiation, i, null)
          : null,
        dni: response.hourly.direct_normal_irradiance
          ? this.safeGetValue(response.hourly.direct_normal_irradiance, i, null)
          : null,
        dhi: response.hourly.diffuse_radiation
          ? this.safeGetValue(response.hourly.diffuse_radiation, i, null)
          : null,
        extraterrestrial: response.hourly.terrestrial_radiation
          ? this.safeGetValue(response.hourly.terrestrial_radiation, i, null)
          : null,

        // Default values
        visibility: 10.0, // Default visibility in km
        precipitation: 0.0,
        precipitationType: null,
        solarZenith: null,
        solarAzimuth: null,
        solarElevation: null,
        airMass: null,
        albedo: 0.2, // Default ground reflectivity
        soilingLoss: null,
        snowDepth: null,
        moduleTemp: null,

        // Metadata
        source: 'open-meteo',
        stationId: null,
        dataQuality: this.assessDataQuality(response, i)
      };

      weatherData.push(weatherRecord);
    }

    return weatherData;
  }

  /**
   * Safely get value from array with fallback
   */
  private static safeGetValue(
    array: number[] | undefined,
    index: number,
    fallback: number | null
  ): number | null {
    if (!array || index >= array.length) {
      return fallback;
    }

    const value = array[index];
    return (value !== null && value !== undefined && !isNaN(value)) ? value : fallback;
  }

  /**
   * Assess data quality based on Open-Meteo response
   */
  private static assessDataQuality(
    response: OpenMeteoResponse,
    index: number
  ): DataQuality {
    // Check for missing critical data
    const temp = response.hourly.temperature_2m?.[index];
    const humidity = response.hourly.relative_humidity_2m?.[index];
    const pressure = response.hourly.pressure_msl?.[index];

    if (temp === null || humidity === null || pressure === null ||
        temp === undefined || humidity === undefined || pressure === undefined ||
        isNaN(temp) || isNaN(humidity) || isNaN(pressure)) {
      return 'POOR';
    }

    // Check for realistic values
    if (temp < -100 || temp > 70 ||     // Temperature range check
        humidity < 0 || humidity > 100 || // Humidity range check
        pressure < 800 || pressure > 1200) { // Pressure range check
      return 'POOR';
    }

    // Check for solar radiation data quality
    const ghi = response.hourly.shortwave_radiation?.[index];
    if (ghi !== undefined && ghi !== null) {
      if (ghi < 0 || ghi > 1500) { // Unrealistic solar radiation
        return 'ESTIMATED';
      }
    }

    return 'GOOD';
  }

  /**
   * Transform single weather record for API responses
   */
  static transformForApi(weatherData: WeatherData): any {
    return {
      id: weatherData.id,
      locationId: weatherData.locationId,
      timestamp: weatherData.timestamp.toISOString(),
      temperature: weatherData.temperature,
      humidity: weatherData.humidity,
      pressure: weatherData.pressure,
      windSpeed: weatherData.windSpeed,
      windDirection: weatherData.windDirection,
      cloudCover: weatherData.cloudCover,
      visibility: weatherData.visibility,
      precipitation: weatherData.precipitation,
      ghi: weatherData.ghi,
      dni: weatherData.dni,
      dhi: weatherData.dhi,
      extraterrestrial: weatherData.extraterrestrial,
      solarZenith: weatherData.solarZenith,
      solarAzimuth: weatherData.solarAzimuth,
      source: weatherData.source,
      dataQuality: weatherData.dataQuality
    };
  }

  /**
   * Create weather data for testing purposes
   */
  static createMockWeatherData(locationId: string, timestamp: Date): WeatherData {
    return {
      id: crypto.randomUUID(),
      timestamp,
      time: timestamp,
      locationId,
      temperature: 20 + Math.random() * 15, // 20-35°C
      humidity: 40 + Math.random() * 40,    // 40-80%
      pressure: 1000 + Math.random() * 40,  // 1000-1040 hPa
      windSpeed: Math.random() * 10,        // 0-10 m/s
      windDirection: Math.random() * 360,   // 0-360°
      cloudCover: Math.random() * 100,      // 0-100%
      visibility: 8 + Math.random() * 12,   // 8-20 km
      precipitation: Math.random() < 0.2 ? Math.random() * 5 : 0, // 20% chance of rain
      precipitationType: null,
      ghi: Math.random() * 1000,            // 0-1000 W/m²
      dni: Math.random() * 900,             // 0-900 W/m²
      dhi: Math.random() * 400,             // 0-400 W/m²
      gti: null,
      extraterrestrial: null,
      solarZenith: null,
      solarAzimuth: null,
      solarElevation: null,
      airMass: null,
      albedo: 0.2,
      soilingLoss: null,
      snowDepth: null,
      moduleTemp: null,
      source: 'mock',
      stationId: null,
      dataQuality: 'GOOD'
    };
  }
}