import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/database";
import { cleanNumericValue } from "$lib/utils/data-validation";

/**
 * Weather DataFrame API endpoint for Python worker
 * Returns weather data in a format suitable for pandas DataFrame conversion
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const locationId = url.searchParams.get("location_id");
    const hours = parseInt(url.searchParams.get("hours") ?? "24");

    if (!locationId) {
      return json(
        {
          success: false,
          error: "location_id parameter is required",
        },
        { status: 400 },
      );
    }

    // Calculate the start date based on hours
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Fetch weather data from database
    const weatherData = await db.weatherData.findMany({
      where: {
        locationId: locationId,
        timestamp: {
          gte: startDate,
        },
      },
      orderBy: {
        timestamp: "asc",
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
        // pressure field doesn't exist in WeatherData model
      },
    });

    // Transform to DataFrame-friendly format with validation
    const dataframeData = weatherData.map((record) => ({
      timestamp: record.timestamp.toISOString(),
      temp_air: cleanNumericValue(record.temperature) ?? 20,  // Default 20°C if invalid
      humidity: cleanNumericValue(record.humidity) ?? 50,     // Default 50% if invalid
      wind_speed: cleanNumericValue(record.windSpeed) ?? 0,   // Default 0 m/s if invalid
      cloud_cover: cleanNumericValue(record.cloudCover) ?? 0, // Default 0% if invalid
      ghi: cleanNumericValue(record.ghi) ?? 0,                // Default 0 W/m² if invalid
      dni: cleanNumericValue(record.dni) ?? 0,                // Default 0 W/m² if invalid
      dhi: cleanNumericValue(record.dhi) ?? 0,                // Default 0 W/m² if invalid
      pressure: 1013.25, // Default pressure as field doesn't exist in model
    }));

    return json({
      success: true,
      data: dataframeData,
      metadata: {
        locationId,
        hours,
        recordCount: dataframeData.length,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Weather DataFrame API error:", error);
    return json(
      {
        success: false,
        error: "Failed to fetch weather data",
      },
      { status: 500 },
    );
  }
};
