import { db } from '../database';
import type { Location } from '@prisma/client';

interface OpenMeteoResponse {
  hourly: {
    time: string[];
    temperature_2m?: number[];
    relative_humidity_2m?: number[];
    wind_speed_10m?: number[];
    cloud_cover?: number[];
    direct_normal_irradiance?: number[];
    direct_radiation?: number[];
    diffuse_radiation?: number[];
  };
}

export class WeatherService {

  /**
   * Sync weather data for a location
   */
  async syncWeatherForLocation(locationId: string) {
    // Get location details
    const location = await db.location.findUnique({
      where: { id: locationId }
    });

    if (!location) {
      throw new Error(`Location ${locationId} not found`);
    }

    // Fetch weather data with solar irradiance
    const weatherData = await this.fetchWeatherData(
      location.latitude,
      location.longitude,
      7 // Fetch 7 days of forecast
    );

    // Save to database
    const saved = await this.saveWeatherData(locationId, weatherData);

    return {
      location: location.name,
      dataPoints: saved,
      startDate: weatherData[0]?.timestamp,
      endDate: weatherData[weatherData.length - 1]?.timestamp
    };
  }

  /**
   * Fetch weather data from Open-Meteo API with solar irradiance
   */
  async fetchWeatherData(latitude: number, longitude: number, days: number = 7) {
    try {
      const startDate = new Date();
      const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      // Include solar radiation parameters for accurate forecasting
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        hourly: [
          'temperature_2m',
          'relative_humidity_2m',
          'wind_speed_10m',
          'cloud_cover',
          'direct_normal_irradiance',
          'direct_radiation',
          'diffuse_radiation'
        ].join(','),
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        timezone: 'UTC'
      });

      const url = `https://api.open-meteo.com/v1/forecast?${params}`;
      console.log('Fetching weather from:', url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.statusText}`);
      }

      const data: OpenMeteoResponse = await response.json();
      return this.transformWeatherData(data);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw error;
    }
  }

  /**
   * Transform Open-Meteo data to our format with solar irradiance
   */
  private transformWeatherData(data: OpenMeteoResponse) {
    const { hourly } = data;
    const weatherData = [];

    for (let i = 0; i < hourly.time.length; i++) {
      // Get solar radiation values
      const dni = hourly.direct_normal_irradiance?.[i] || hourly.direct_radiation?.[i] || 0;
      const diffuse = hourly.diffuse_radiation?.[i] || 0;

      // Calculate GHI (Global Horizontal Irradiance)
      // GHI = Direct Radiation + Diffuse Radiation
      const ghi = (hourly.direct_radiation?.[i] || 0) + diffuse;

      // Calculate DHI (Diffuse Horizontal Irradiance) - same as diffuse radiation
      const dhi = diffuse;

      weatherData.push({
        timestamp: new Date(hourly.time[i]),
        temperature: hourly.temperature_2m?.[i] || 0,
        humidity: hourly.relative_humidity_2m?.[i] || 0,
        windSpeed: hourly.wind_speed_10m?.[i] || 0,
        cloudCover: hourly.cloud_cover?.[i] || 0,
        ghi: Math.round(ghi), // Global Horizontal Irradiance in W/m²
        dni: Math.round(dni), // Direct Normal Irradiance in W/m²
        dhi: Math.round(dhi), // Diffuse Horizontal Irradiance in W/m²
        pressure: 1013, // Standard atmospheric pressure as default
        precipitation: 0 // Not critical for solar
      });
    }

    return weatherData;
  }

  /**
   * Save weather data to database
   */
  async saveWeatherData(locationId: string, weatherData: any[]) {
    let savedCount = 0;

    for (const data of weatherData) {
      try {
        // Upsert weather data (update if exists, create if not)
        await db.weatherData.upsert({
          where: {
            locationId_timestamp: {
              locationId: locationId,
              timestamp: data.timestamp
            }
          },
          update: {
            temperature: data.temperature,
            humidity: data.humidity,
            windSpeed: data.windSpeed,
            cloudCover: data.cloudCover,
            ghi: data.ghi,
            dni: data.dni,
            dhi: data.dhi,
            pressure: data.pressure,
            precipitation: data.precipitation
          },
          create: {
            locationId: locationId,
            timestamp: data.timestamp,
            temperature: data.temperature,
            humidity: data.humidity,
            windSpeed: data.windSpeed,
            cloudCover: data.cloudCover,
            ghi: data.ghi,
            dni: data.dni,
            dhi: data.dhi,
            pressure: data.pressure,
            precipitation: data.precipitation,
            dataQuality: 'GOOD',
            source: 'OPEN_METEO'
          }
        });
        savedCount++;
      } catch (error) {
        console.error('Error saving weather data point:', error);
        // Continue with next data point
      }
    }

    console.log(`Saved ${savedCount} weather data points for location ${locationId}`);
    return savedCount;
  }

  /**
   * Get recent weather data for a location
   */
  async getRecentWeather(locationId: string, hours: number = 24) {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    return await db.weatherData.findMany({
      where: {
        locationId: locationId,
        timestamp: {
          gte: startDate
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });
  }
}