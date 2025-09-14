import type { RequestHandler } from './$types';

/**
 * GET /api
 * API Index - Lists all available APIs and documentation
 */
export const GET: RequestHandler = async () => {
  const apiIndex = {
    success: true,
    message: "Solar Forecast Platform API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    apis: {
      weather: {
        name: "Weather API",
        description: "Weather and solar radiation data from Open-Meteo",
        baseUrl: "/api/weather",
        documentation: {
          interactive: "/swagger",
          spec: "/api/swagger/spec"
        },
        health: "/api/weather/health",
        endpoints: {
          current: "GET /api/weather?location_id={uuid}",
          forecast: "GET /api/weather?location_id={uuid}&days={1-16}",
          historical: "GET /api/weather?location_id={uuid}&start_date={date}&end_date={date}",
          aggregated: "GET /api/weather?location_id={uuid}&interval={15min|1hour|6hour|1day}&hours={1-720}",
          sync: "POST /api/weather/sync",
          byId: "GET /api/weather/{uuid}"
        }
      },
      locations: {
        name: "Locations API",
        description: "Solar installation location management",
        baseUrl: "/api/locations",
        documentation: {
          note: "Documentation available in existing codebase"
        },
        endpoints: {
          list: "GET /api/locations",
          byId: "GET /api/locations/{uuid}",
          create: "POST /api/locations",
          update: "PUT /api/locations/{uuid}",
          delete: "DELETE /api/locations/{uuid}"
        }
      },
      analysis: {
        name: "Analysis API",
        description: "Data analysis and forecasting endpoints",
        baseUrl: "/api/analysis",
        documentation: {
          note: "Existing endpoints for forecast analysis"
        },
        endpoints: {
          forecast: "GET /api/analysis/forecast",
          accuracy: "GET /api/analysis/accuracy",
          historical: "GET /api/analysis/historical"
        }
      }
    },
    documentation: {
      swagger: {
        interactive: "/swagger",
        spec: "/api/swagger/spec"
      },
      openapi: {
        spec: "/api/swagger/spec"
      }
    },
    health: {
      weather: "/api/weather/health",
      database: "/api/timescale/health",
      system: "/api/health"
    },
    features: [
      "Real-time weather data from Open-Meteo",
      "TimescaleDB time-series optimization",
      "Solar radiation components (GHI, DNI, DHI)",
      "Automated data synchronization",
      "Historical data access and aggregation",
      "Comprehensive health monitoring",
      "OpenAPI 3.0 specification",
      "Interactive Swagger UI documentation"
    ],
    support: {
      repository: "https://github.com/solar-forecast-platform",
      issues: "https://github.com/solar-forecast-platform/issues",
      documentation: "https://docs.solar-forecast-platform.com"
    }
  };

  return new Response(JSON.stringify(apiIndex, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
    }
  });
};