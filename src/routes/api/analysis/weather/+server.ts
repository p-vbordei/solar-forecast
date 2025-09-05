import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const location = url.searchParams.get('location');
    const interval = url.searchParams.get('interval') || 'hourly';
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');

    if (!location || !start || !end) {
      return json(
        { success: false, error: 'Missing required parameters: location, start, end' },
        { status: 400 }
      );
    }

    // Mock weather data - replace with actual API call to weather service
    const weatherData = generateMockWeatherData(start, end, interval);

    return json({
      success: true,
      data: weatherData,
      metadata: {
        location,
        interval,
        start,
        end,
        dataPoints: weatherData.length
      }
    });
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return json(
      { success: false, error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
};

function generateMockWeatherData(start: string, end: string, interval: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const data = [];
  
  let currentDate = new Date(startDate);
  let intervalMs: number;
  
  switch (interval) {
    case '15min':
      intervalMs = 15 * 60 * 1000;
      break;
    case 'hourly':
      intervalMs = 60 * 60 * 1000;
      break;
    case 'daily':
      intervalMs = 24 * 60 * 60 * 1000;
      break;
    case 'weekly':
      intervalMs = 7 * 24 * 60 * 60 * 1000;
      break;
    default:
      intervalMs = 60 * 60 * 1000;
  }
  
  while (currentDate <= endDate) {
    const hour = currentDate.getHours();
    const dayOfYear = Math.floor((currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    // Simulate realistic weather patterns
    let ghi = 0; // Global Horizontal Irradiance
    let dni = 0; // Direct Normal Irradiance
    let dhi = 0; // Diffuse Horizontal Irradiance
    let temperature = 15 + Math.sin(dayOfYear / 365 * 2 * Math.PI) * 20; // Seasonal temperature
    let humidity = 50 + Math.random() * 30;
    let cloud_cover = Math.random() * 100;
    let wind_speed = 5 + Math.random() * 15;
    let pressure = 1013 + (Math.random() - 0.5) * 40;
    
    // Daylight hours (6 AM to 6 PM)
    if (hour >= 6 && hour <= 18) {
      const solarFactor = Math.sin((hour - 6) / 12 * Math.PI);
      const clearSkyGHI = 1000 * solarFactor;
      const cloudFactor = 1 - (cloud_cover / 100) * 0.8;
      
      ghi = Math.max(0, clearSkyGHI * cloudFactor * (0.8 + Math.random() * 0.4));
      dni = Math.max(0, ghi * (0.7 + Math.random() * 0.3));
      dhi = Math.max(0, ghi - dni * Math.cos(Math.PI / 4)); // Approximate DHI
    }
    
    data.push({
      timestamp: currentDate.toISOString(),
      ghi: Math.round(ghi * 100) / 100,
      dni: Math.round(dni * 100) / 100,
      dhi: Math.round(dhi * 100) / 100,
      temperature: Math.round(temperature * 10) / 10,
      humidity: Math.round(humidity * 10) / 10,
      cloud_cover: Math.round(cloud_cover * 10) / 10,
      wind_speed: Math.round(wind_speed * 10) / 10,
      pressure: Math.round(pressure * 10) / 10,
      weather_condition: getWeatherCondition(cloud_cover, ghi),
      uv_index: Math.max(0, Math.round(ghi / 100))
    });
    
    currentDate = new Date(currentDate.getTime() + intervalMs);
  }
  
  return data;
}

function getWeatherCondition(cloudCover: number, ghi: number): string {
  if (ghi === 0) return 'night';
  if (cloudCover < 20) return 'clear';
  if (cloudCover < 50) return 'partly_cloudy';
  if (cloudCover < 80) return 'mostly_cloudy';
  return 'overcast';
}