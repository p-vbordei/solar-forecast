import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';

/**
 * Simple weather data endpoint for Python forecast service
 * Returns weather data in format that's easy to convert to pandas DataFrame
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const locationId = url.searchParams.get('location_id');
    const hours = parseInt(url.searchParams.get('hours') || '24');

    if (!locationId) {
      return json({ error: 'location_id is required' }, { status: 400 });
    }

    // Simple query to get recent weather data
    const weatherData = await db.weatherData.findMany({
      where: {
        locationId,
        timestamp: {
          gte: new Date(Date.now() - hours * 60 * 60 * 1000)
        }
      },
      orderBy: {
        timestamp: 'asc'
      },
      select: {
        timestamp: true,
        temperature: true,
        humidity: true,
        windSpeed: true,
        cloudCover: true,
        ghi: true,
        dni: true,
        dhi: true,
        pressure: true
      }
    });

    // Format for easy pandas DataFrame creation
    const formattedData = weatherData.map(record => ({
      timestamp: record.timestamp.toISOString(),
      temperature: record.temperature || 0,
      humidity: record.humidity || 0,
      windSpeed: record.windSpeed || 0,
      cloudCover: record.cloudCover || 0,
      ghi: record.ghi || 0,
      dni: record.dni || 0,
      dhi: record.dhi || 0,
      pressure: record.pressure || 1013.25
    }));

    return json({
      success: true,
      data: formattedData,
      count: formattedData.length,
      locationId,
      hours
    });

  } catch (error) {
    console.error('Weather dataframe API error:', error);
    return json({
      success: false,
      error: 'Failed to fetch weather data'
    }, { status: 500 });
  }
};