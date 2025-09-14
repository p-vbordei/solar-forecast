import type { RequestHandler } from './$types';
import { WeatherController } from '$lib/features/weather/controllers/WeatherController';

const controller = new WeatherController();

/**
 * GET /api/weather/{id}
 * Get specific weather record by ID (GUID)
 */
export const GET: RequestHandler = (event) => controller.getWeatherById(event);

/**
 * PUT /api/weather/{id}
 * Update specific weather record by ID (GUID)
 * Note: This is typically not needed as weather data is read-only from external API
 */
export const PUT: RequestHandler = async (event) => {
  // Weather data is typically read-only from external sources
  // This endpoint is included for completeness but may not be implemented
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Weather data modification not supported',
      message: 'Weather records are read-only and sourced from external APIs'
    }),
    {
      status: 405, // Method Not Allowed
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
};

/**
 * DELETE /api/weather/{id}
 * Delete specific weather record by ID (GUID)
 * Note: This is typically not needed as weather data cleanup is handled automatically
 */
export const DELETE: RequestHandler = async (event) => {
  // Weather data cleanup is typically handled by scheduled jobs
  // This endpoint is included for completeness but may not be implemented
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Individual weather record deletion not supported',
      message: 'Weather data cleanup is handled automatically by scheduled maintenance jobs'
    }),
    {
      status: 405, // Method Not Allowed
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
};