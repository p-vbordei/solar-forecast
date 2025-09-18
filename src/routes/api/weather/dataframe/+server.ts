import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/database";

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

    // Transform to DataFrame-friendly format
    const dataframeData = weatherData.map((record) => ({
      timestamp: record.timestamp.toISOString(),
      temp_air: record.temperature,
      humidity: record.humidity,
      wind_speed: record.windSpeed,
      cloud_cover: record.cloudCover,
      ghi: record.ghi,
      dni: record.dni,
      dhi: record.dhi,
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
