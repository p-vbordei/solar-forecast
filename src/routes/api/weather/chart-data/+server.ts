import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/weather/chart-data
 * Get weather data formatted for charts (Dashboard and Forecast pages)
 */
export const GET: RequestHandler = async ({ url }) => {
  const locationId = url.searchParams.get('location_id') || '1';
  const timeRange = url.searchParams.get('time_range') || 'Today';
  const parameters = url.searchParams.get('parameters')?.split(',') || ['shortwave_radiation', 'temperature_2m', 'cloud_cover'];

  console.log('Weather chart API called:', { locationId, timeRange, parameters });

  try {
    // Check if we have any weather data
    const dataCount = await db.weatherData.count();
    console.log('Weather data count in database:', dataCount);

    if (dataCount === 0) {
      // Return mock data if database is empty
      console.log('No weather data in database, returning mock data');
      const mockData = generateMockChartData(
        parameters,
        timeRange === '7 Days' ? 'daily' : 'hourly'
      );

      return json({
        success: true,
        data: mockData,
        metadata: {
          locationId,
          timeRange,
          parameters,
          dataPoints: mockData.labels?.length || 0,
          isMockData: true,
          message: 'No weather data in database, using mock data'
        }
      });
    }

    // Calculate date range based on timeRange
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    let interval = 'hourly';

    switch (timeRange) {
      case 'Today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        interval = 'hourly';
        break;
      case 'Tomorrow':
        startDate.setDate(startDate.getDate() + 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(23, 59, 59, 999);
        interval = 'hourly';
        break;
      case '7 Days':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        interval = 'daily';
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        interval = 'hourly';
        break;
      case '48h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        interval = 'hourly';
        break;
      case '72h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        endDate = new Date(now.getTime() + 72 * 60 * 60 * 1000);
        interval = 'hourly';
        break;
      case '7d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        interval = 'daily';
        break;
    }

    // Get the actual location UUID
    const actualLocationId = await getLocationGuid(locationId);
    console.log('Using location ID:', actualLocationId, 'for input:', locationId);

    // Fetch weather data from database
    const weatherData = await db.weatherData.findMany({
      where: {
        locationId: actualLocationId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    console.log(`Found ${weatherData.length} weather records for location ${actualLocationId}`);

    // Format data for charts
    const chartData = formatChartData(weatherData, parameters, interval);

    return json({
      success: true,
      data: chartData,
      metadata: {
        locationId,
        timeRange,
        parameters,
        dataPoints: chartData.labels?.length || 0,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error fetching weather chart data:', error);

    // Return mock data on error
    const mockData = generateMockChartData(
      parameters || ['shortwave_radiation', 'temperature_2m', 'cloud_cover'],
      timeRange === '7 Days' ? 'daily' : 'hourly'
    );

    return json({
      success: true,
      data: mockData,
      metadata: {
        locationId,
        timeRange,
        parameters,
        dataPoints: mockData.labels?.length || 0,
        isMockData: true,
        error: error.message
      }
    });
  }
};

/**
 * Format weather data for chart display
 */
function formatChartData(weatherData: any[], parameters: string[], interval: string) {
  if (!weatherData || weatherData.length === 0) {
    return generateMockChartData(parameters, interval);
  }

  const labels: string[] = [];
  const datasets: any[] = [];

  // Parameter configurations - support both naming conventions
  const paramConfig: Record<string, any> = {
    ghi: { name: 'Solar Radiation', unit: 'W/m²', color: '#f59e0b' },
    shortwave_radiation: { name: 'Solar Radiation', unit: 'W/m²', color: '#f59e0b' },
    temperature: { name: 'Temperature', unit: '°C', color: '#ef4444' },
    temperature_2m: { name: 'Temperature', unit: '°C', color: '#ef4444' },
    cloudCover: { name: 'Cloud Coverage', unit: '%', color: '#6b7280' },
    cloud_cover: { name: 'Cloud Coverage', unit: '%', color: '#6b7280' },
    windSpeed: { name: 'Wind Speed', unit: 'm/s', color: '#10b981' },
    wind_speed_10m: { name: 'Wind Speed', unit: 'm/s', color: '#10b981' },
    humidity: { name: 'Humidity', unit: '%', color: '#3b82f6' },
    relative_humidity_2m: { name: 'Humidity', unit: '%', color: '#3b82f6' },
    dni: { name: 'Direct Normal Irradiance', unit: 'W/m²', color: '#8b5cf6' },
    dhi: { name: 'Diffuse Horizontal Irradiance', unit: 'W/m²', color: '#ec4899' }
  };

  // Process data points
  weatherData.forEach(point => {
    const timestamp = new Date(point.timestamp);
    if (interval === 'hourly') {
      labels.push(timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    } else if (interval === 'daily') {
      labels.push(timestamp.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }
  });

  // Create datasets for each parameter
  parameters.forEach(param => {
    const config = paramConfig[param];
    if (config) {
      const data = weatherData.map(point => {
        // Map database fields to chart parameters - support both naming conventions
        switch (param) {
          case 'ghi':
          case 'shortwave_radiation':
            return point.ghi || 0;
          case 'temperature':
          case 'temperature_2m':
            return point.temperature || 0;
          case 'cloudCover':
          case 'cloud_cover':
            return point.cloudCover || 0;
          case 'windSpeed':
          case 'wind_speed_10m':
            return point.windSpeed || 0;
          case 'humidity':
          case 'relative_humidity_2m':
            return point.humidity || 0;
          case 'dni':
            return point.dni || 0;
          case 'dhi':
            return point.dhi || 0;
          default:
            return 0;
        }
      });

      datasets.push({
        label: config.name,
        data,
        borderColor: config.color,
        backgroundColor: config.color + '20',
        tension: 0.4,
        fill: false
      });
    }
  });

  return { labels, datasets };
}

/**
 * Generate mock chart data when no real data is available
 */
function generateMockChartData(parameters: string[], interval: string) {
  const hours = interval === 'daily' ? 7 * 24 : 24;
  const labels: string[] = [];
  const datasets: any[] = [];

  // Generate time labels
  const now = new Date();
  for (let i = 0; i < (interval === 'daily' ? 7 : 24); i++) {
    if (interval === 'hourly') {
      labels.push(`${i.toString().padStart(2, '0')}:00`);
    } else {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }
  }

  // Parameter configurations with mock data generation
  const paramConfig: Record<string, any> = {
    ghi: {
      name: 'Solar Radiation',
      unit: 'W/m²',
      color: '#f59e0b',
      generateData: (i: number) => Math.max(0, Math.sin((i - 6) * Math.PI / 12) * 800 + Math.random() * 100)
    },
    shortwave_radiation: {
      name: 'Solar Radiation',
      unit: 'W/m²',
      color: '#f59e0b',
      generateData: (i: number) => Math.max(0, Math.sin((i - 6) * Math.PI / 12) * 800 + Math.random() * 100)
    },
    temperature: {
      name: 'Temperature',
      unit: '°C',
      color: '#ef4444',
      generateData: (i: number) => 15 + Math.sin((i - 6) * Math.PI / 12) * 10 + Math.random() * 2
    },
    temperature_2m: {
      name: 'Temperature',
      unit: '°C',
      color: '#ef4444',
      generateData: (i: number) => 15 + Math.sin((i - 6) * Math.PI / 12) * 10 + Math.random() * 2
    },
    cloudCover: {
      name: 'Cloud Coverage',
      unit: '%',
      color: '#6b7280',
      generateData: (i: number) => 30 + Math.random() * 40
    },
    cloud_cover: {
      name: 'Cloud Coverage',
      unit: '%',
      color: '#6b7280',
      generateData: (i: number) => 30 + Math.random() * 40
    },
    windSpeed: {
      name: 'Wind Speed',
      unit: 'm/s',
      color: '#10b981',
      generateData: (i: number) => 5 + Math.random() * 10
    },
    wind_speed_10m: {
      name: 'Wind Speed',
      unit: 'm/s',
      color: '#10b981',
      generateData: (i: number) => 5 + Math.random() * 10
    },
    humidity: {
      name: 'Humidity',
      unit: '%',
      color: '#3b82f6',
      generateData: (i: number) => 60 + Math.sin(i * 0.3) * 20 + Math.random() * 10
    },
    relative_humidity_2m: {
      name: 'Humidity',
      unit: '%',
      color: '#3b82f6',
      generateData: (i: number) => 60 + Math.sin(i * 0.3) * 20 + Math.random() * 10
    }
  };

  // Create datasets for each parameter
  parameters.forEach(param => {
    const config = paramConfig[param];
    if (config) {
      const data = labels.map((_, i) => config.generateData(i));
      datasets.push({
        label: config.name,
        data,
        borderColor: config.color,
        backgroundColor: config.color + '20',
        tension: 0.4,
        fill: false
      });
    }
  });

  return { labels, datasets };
}

/**
 * Get location GUID from numeric ID or return the ID if it's already a GUID
 */
async function getLocationGuid(locationId: string): Promise<string> {
  // If it's already a UUID, return it
  if (locationId.includes('-')) {
    return locationId;
  }

  // Otherwise, fetch the actual location from database
  try {
    const locations = await db.location.findMany({
      select: { id: true },
      orderBy: { name: 'asc' }
    });

    // Map numeric IDs to actual UUIDs (by order)
    const numericId = parseInt(locationId) - 1; // Convert 1-based to 0-based
    if (locations[numericId]) {
      return locations[numericId].id;
    }
  } catch (error) {
    console.error('Error fetching location ID:', error);
  }

  // Fallback - return first location
  const firstLocation = await db.location.findFirst();
  return firstLocation?.id || locationId;
}

/**
 * Seed sample weather data for testing
 */
async function seedSampleWeatherData() {
  console.log('Seeding sample weather data...');

  const locations = [
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440004'
  ];

  const now = new Date();
  const weatherData = [];

  // Generate data for last 7 days and next 7 days (hourly)
  for (const locationId of locations) {
    for (let day = -7; day <= 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(now);
        timestamp.setDate(now.getDate() + day);
        timestamp.setHours(hour, 0, 0, 0);

        const sunAngle = Math.sin((hour - 6) * Math.PI / 12);
        const dayVariation = Math.sin(day * 0.3) * 0.2;

        weatherData.push({
          id: uuidv4(),
          timestamp,
          locationId,
          temperature: 15 + sunAngle * 10 + dayVariation * 5 + Math.random() * 2,
          humidity: 60 + Math.sin(hour * 0.5) * 20 + Math.random() * 10,
          windSpeed: 5 + Math.random() * 10 + dayVariation * 3,
          cloudCover: Math.max(0, Math.min(100, 30 + Math.random() * 40 + dayVariation * 20)),
          ghi: Math.max(0, sunAngle * 800 + Math.random() * 100 - dayVariation * 200),
          dni: Math.max(0, sunAngle * 600 + Math.random() * 80 - dayVariation * 150),
          dhi: Math.max(0, sunAngle * 200 + Math.random() * 50),
          source: 'open-meteo',
          dataQuality: 'GOOD'
        });
      }
    }
  }

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < weatherData.length; i += batchSize) {
    const batch = weatherData.slice(i, i + batchSize);
    await db.weatherData.createMany({
      data: batch,
      skipDuplicates: true
    });
  }

  console.log(`Seeded ${weatherData.length} weather data records`);
}