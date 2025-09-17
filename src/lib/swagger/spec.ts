export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Solar Forecast API',
    version: '1.0.0',
    description: 'API for managing solar panel locations and forecasting production',
    contact: {
      name: 'API Support',
      email: 'support@solarforecast.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:5173',
      description: 'Development server'
    },
    {
      url: 'https://api.solarforecast.com',
      description: 'Production server'
    }
  ],
  tags: [
    {
      name: 'Dashboard',
      description: 'Dashboard statistics and metrics'
    },
    {
      name: 'Locations',
      description: 'Solar panel location management'
    },
    {
      name: 'Weather',
      description: 'Weather and solar radiation data from Open-Meteo API'
    },
    {
      name: 'Health',
      description: 'System health monitoring and diagnostics'
    },
    {
      name: 'Reports',
      description: 'Report generation and management'
    },
    {
      name: 'Forecasts',
      description: 'Solar power forecasting with Python worker integration'
    },
    {
      name: 'Historical Analysis',
      description: 'Historical data analysis and template generation'
    }
  ],
  paths: {
    '/api/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get dashboard statistics',
        description: 'Retrieve real-time dashboard metrics including active locations, total capacity, solar power, and current temperature',
        responses: {
          200: {
            description: 'Dashboard statistics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/DashboardStats' }
                  }
                }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Internal server error',
                  details: 'Failed to retrieve dashboard statistics',
                  code: 'INTERNAL_ERROR'
                }
              }
            }
          }
        }
      }
    },
    '/api/locations': {
      get: {
        tags: ['Locations'],
        summary: 'Get all locations',
        description: 'Retrieve all solar panel locations with optional filtering and pagination',
        parameters: [
          {
            name: 'search',
            in: 'query',
            description: 'Search term to filter locations by name',
            required: false,
            schema: {
              type: 'string'
            }
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter locations by status',
            required: false,
            schema: {
              type: 'string',
              enum: ['active', 'inactive', 'maintenance']
            }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of locations to return',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50
            }
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Number of locations to skip',
            required: false,
            schema: {
              type: 'integer',
              minimum: 0,
              default: 0
            }
          }
        ],
        responses: {
          200: {
            description: 'List of locations retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Location' }
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        size: { type: 'integer' },
                        current: { type: 'integer' }
                      }
                    },
                    filters: {
                      type: 'object',
                      properties: {
                        search: { type: 'string', nullable: true },
                        status: { type: 'string', nullable: true }
                      }
                    }
                  }
                }
              }
            }
          },
          400: {
            description: 'Bad request - Invalid query parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Limit must be between 1 and 100',
                  field: 'limit',
                  code: 'BAD_REQUEST'
                }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Internal server error',
                  details: 'Database connection failed',
                  code: 'INTERNAL_ERROR'
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Locations'],
        summary: 'Create a new location',
        description: 'Creates a new solar panel location with coordinates and configuration',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateLocationRequest' },
              example: {
                name: 'Solar Farm Alpha',
                coordinates: {
                  latitude: 45.5,
                  longitude: -73.6
                },
                basic: {
                  capacity_mw: 10,
                  status: 'active'
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Location created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/Location' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Bad request - Invalid request body',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Failed to create location',
                  details: 'Invalid JSON in request body',
                  code: 'BAD_REQUEST'
                }
              }
            }
          },
          409: {
            description: 'Conflict - Location already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'A location with this name already exists',
                  details: 'Location names must be unique',
                  code: 'CONFLICT'
                }
              }
            }
          },
          422: {
            description: 'Validation error - Invalid input data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Location name is required',
                  field: 'name',
                  code: 'VALIDATION_ERROR'
                }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Internal server error',
                  details: 'Database connection failed',
                  code: 'INTERNAL_ERROR'
                }
              }
            }
          }
        }
      }
    },
    '/api/locations/{id}': {
      get: {
        tags: ['Locations'],
        summary: 'Get location by ID',
        description: 'Retrieve a specific location by its unique identifier',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Location GUID',
            schema: {
              type: 'string',
              format: 'uuid'
            },
            example: '123e4567-e89b-12d3-a456-426614174000'
          }
        ],
        responses: {
          200: {
            description: 'Location retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Location' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Bad request - Invalid GUID format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Location ID is required',
                  field: 'id',
                  code: 'BAD_REQUEST'
                }
              }
            }
          },
          404: {
            description: 'Location not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Location with ID 123e4567-e89b-12d3-a456-426614174000 not found',
                  details: 'Location does not exist in the system',
                  code: 'NOT_FOUND'
                }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Internal server error',
                  details: 'Database connection failed',
                  code: 'INTERNAL_ERROR'
                }
              }
            }
          }
        }
      },
      put: {
        tags: ['Locations'],
        summary: 'Update location',
        description: 'Update an existing location with new data',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Location GUID',
            schema: {
              type: 'string',
              format: 'uuid'
            },
            example: '123e4567-e89b-12d3-a456-426614174000'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateLocationRequest' },
              example: {
                name: 'Updated Solar Farm',
                coordinates: {
                  latitude: 45.6,
                  longitude: -73.7
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Location updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/Location' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Bad request - Invalid GUID format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Location ID is required',
                  field: 'id',
                  code: 'BAD_REQUEST'
                }
              }
            }
          },
          404: {
            description: 'Location not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Location with ID 123e4567-e89b-12d3-a456-426614174000 not found',
                  details: 'Location does not exist in the system',
                  code: 'NOT_FOUND'
                }
              }
            }
          },
          409: {
            description: 'Conflict - Location name already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'A location with this name already exists',
                  details: 'Location names must be unique',
                  code: 'CONFLICT'
                }
              }
            }
          },
          422: {
            description: 'Validation error - Invalid input data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Invalid coordinates provided',
                  field: 'coordinates',
                  code: 'VALIDATION_ERROR'
                }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Internal server error',
                  details: 'Database connection failed',
                  code: 'INTERNAL_ERROR'
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Locations'],
        summary: 'Delete location',
        description: 'Soft delete a location (marks as deleted but preserves data)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Location GUID',
            schema: {
              type: 'string',
              format: 'uuid'
            },
            example: '123e4567-e89b-12d3-a456-426614174000'
          }
        ],
        responses: {
          200: {
            description: 'Location deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Location deleted successfully' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Bad request - Invalid GUID format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Location ID is required',
                  field: 'id',
                  code: 'BAD_REQUEST'
                }
              }
            }
          },
          404: {
            description: 'Location not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Location with ID 123e4567-e89b-12d3-a456-426614174000 not found',
                  details: 'Location does not exist or has already been deleted',
                  code: 'NOT_FOUND'
                }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Internal server error',
                  details: 'Database connection failed',
                  code: 'INTERNAL_ERROR'
                }
              }
            }
          }
        }
      }
    },
    '/api/weather': {
      get: {
        tags: ['Weather'],
        summary: 'Get weather data',
        description: 'Retrieve weather data for a specific location. Behavior changes based on query parameters.',
        parameters: [
          {
            name: 'location_id',
            in: 'query',
            description: 'GUID of the location',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000'
            }
          },
          {
            name: 'days',
            in: 'query',
            description: 'Number of forecast days (1-16)',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 16,
              example: 7
            }
          },
          {
            name: 'start_date',
            in: 'query',
            description: 'Start date for historical data (YYYY-MM-DD)',
            required: false,
            schema: {
              type: 'string',
              format: 'date',
              example: '2023-11-01'
            }
          },
          {
            name: 'end_date',
            in: 'query',
            description: 'End date for historical data (YYYY-MM-DD)',
            required: false,
            schema: {
              type: 'string',
              format: 'date',
              example: '2023-11-30'
            }
          },
          {
            name: 'interval',
            in: 'query',
            description: 'Aggregation interval for time-bucket queries',
            required: false,
            schema: {
              type: 'string',
              enum: ['15min', '1hour', '6hour', '1day'],
              example: '1hour'
            }
          },
          {
            name: 'hours',
            in: 'query',
            description: 'Number of hours for aggregated data (1-720)',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 720,
              default: 24,
              example: 24
            }
          }
        ],
        responses: {
          200: {
            description: 'Weather data retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        locationId: { type: 'string', format: 'uuid' },
                        currentWeather: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/WeatherData' }
                        },
                        recordCount: { type: 'integer' },
                        source: { type: 'string', example: 'open-meteo' },
                        generatedAt: { type: 'string', format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: {
            description: 'Bad request - Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      post: {
        tags: ['Weather'],
        summary: 'Synchronize weather data',
        description: 'Trigger weather data synchronization for all locations or specific locations.',
        requestBody: {
          description: 'Weather synchronization configuration',
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SyncWeatherRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Weather synchronization completed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SyncWeatherResponse' }
              }
            }
          },
          400: {
            description: 'Bad request - Invalid sync parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/weather/{id}': {
      get: {
        tags: ['Weather'],
        summary: 'Get weather record by ID',
        description: 'Retrieve a specific weather record using its GUID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: 'GUID of the weather record',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            }
          }
        ],
        responses: {
          200: {
            description: 'Weather record retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/WeatherData' }
                  }
                }
              }
            }
          },
          404: {
            description: 'Weather record not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/weather/health': {
      get: {
        tags: ['Health'],
        summary: 'Weather system health check',
        description: 'Check the health status of the weather system including database connectivity, Open-Meteo API availability, and scheduler status.',
        responses: {
          200: {
            description: 'Health check completed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthCheckResponse' }
              }
            }
          },
          503: {
            description: 'System unhealthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthCheckResponse' }
              }
            }
          }
        }
      }
    },
    '/api/reports/{id}': {
      get: {
        tags: ['Reports'],
        summary: 'Download a report',
        description: 'Download a generated report by its GUID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: 'The GUID of the report to download',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid'
            },
            example: '789a0123-b456-78c9-d012-345678901234'
          }
        ],
        responses: {
          200: {
            description: 'Report downloaded successfully',
            content: {
              'application/pdf': {
                schema: {
                  type: 'string',
                  format: 'binary'
                }
              },
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: {
                  type: 'string',
                  format: 'binary'
                }
              },
              'text/csv': {
                schema: {
                  type: 'string',
                  format: 'binary'
                }
              }
            }
          },
          400: {
            description: 'Bad request - Missing report ID',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          404: {
            description: 'Report not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/reports/generate': {
      post: {
        tags: ['Reports'],
        summary: 'Generate a new report',
        description: 'Generate a new report in Excel format',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GenerateReportRequest' },
              example: {
                reportType: 'forecast_d1_plus_5',
                startDate: '2024-01-01',
                endDate: '2024-01-06',
                locationIds: ['123e4567-e89b-12d3-a456-426614174000'],
                dataAggregation: '15min',
                timezone: 'UTC+2'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Report generated successfully in Excel format',
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: {
                  type: 'string',
                  format: 'binary'
                }
              }
            }
          },
          400: {
            description: 'Bad request - Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Start date must be before end date',
                  code: 'BAD_REQUEST'
                }
              }
            }
          },
          422: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Invalid report type',
                  field: 'reportType',
                  code: 'VALIDATION_ERROR'
                }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/forecasts/generate': {
      post: {
        tags: ['Forecasts'],
        summary: 'Generate solar power forecast',
        description: 'Generate a new solar power forecast using Python worker ML models',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GenerateForecastRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Forecast generated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ForecastResponse' }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/api/forecasts/worker/status': {
      get: {
        tags: ['Forecasts'],
        summary: 'Check Python worker status',
        description: 'Verify connectivity and health of the Python worker service',
        responses: {
          200: {
            description: 'Python worker status information',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WorkerStatusResponse' }
              }
            }
          },
          503: {
            description: 'Python worker unavailable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/forecasts/worker/bulk': {
      post: {
        tags: ['Forecasts'],
        summary: 'Generate bulk forecasts',
        description: 'Generate forecasts for multiple locations simultaneously',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BulkForecastRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Bulk forecast initiated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BulkForecastResponse' }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/InternalError' }
        }
      },
      get: {
        tags: ['Forecasts'],
        summary: 'Check bulk forecast status',
        description: 'Check the status of a bulk forecast operation',
        parameters: [
          {
            name: 'task_id',
            in: 'query',
            required: true,
            description: 'Task ID from bulk forecast initiation',
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Bulk forecast status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BulkForecastStatusResponse' }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/api/forecasts/worker/validate': {
      post: {
        tags: ['Forecasts'],
        summary: 'Validate forecast parameters',
        description: 'Validate forecast parameters and test connection before generating actual forecasts',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidateForecastRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Validation successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationResponse' }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: {
            description: 'Location not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          503: {
            description: 'Python worker unavailable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/forecasts/worker/models': {
      get: {
        tags: ['Forecasts'],
        summary: 'Get available ML models',
        description: 'Retrieve list of available forecasting models from Python worker',
        responses: {
          200: {
            description: 'Available models list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ModelsResponse' }
              }
            }
          },
          500: { $ref: '#/components/responses/InternalError' }
        }
      },
      post: {
        tags: ['Forecasts'],
        summary: 'Test ML model',
        description: 'Test a specific model with a sample forecast request',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TestModelRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Model test successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ModelTestResponse' }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/api/historical-analysis/generate-template': {
      get: {
        tags: ['Historical Analysis'],
        summary: 'Generate production data template',
        description: 'Generate a CSV template for production data with configurable parameters including location info, date range, and aggregation level',
        parameters: [
          {
            name: 'location_name',
            in: 'query',
            description: 'Name of the solar location',
            required: false,
            schema: {
              type: 'string',
              default: 'Solar Farm Site A'
            },
            example: 'Solar Farm Alpha'
          },
          {
            name: 'location_guid',
            in: 'query',
            description: 'GUID placeholder for the location',
            required: false,
            schema: {
              type: 'string',
              default: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
            },
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          {
            name: 'time_aggregation',
            in: 'query',
            description: 'Time aggregation level for the data',
            required: false,
            schema: {
              type: 'string',
              enum: ['15min', 'hourly', 'daily'],
              default: 'hourly'
            }
          },
          {
            name: 'start_date',
            in: 'query',
            description: 'Start date for the template data range',
            required: true,
            schema: {
              type: 'string',
              format: 'date',
              pattern: '^\\d{4}-\\d{2}-\\d{2}$'
            },
            example: '2025-09-14'
          },
          {
            name: 'end_date',
            in: 'query',
            description: 'End date for the template data range',
            required: true,
            schema: {
              type: 'string',
              format: 'date',
              pattern: '^\\d{4}-\\d{2}-\\d{2}$'
            },
            example: '2025-09-21'
          },
          {
            name: 'timezone',
            in: 'query',
            description: 'Timezone in ±HH:MM format',
            required: false,
            schema: {
              type: 'string',
              pattern: '^[+-]\\d{2}:\\d{2}$',
              default: '+03:00'
            },
            example: '+03:00'
          },
          {
            name: 'format',
            in: 'query',
            description: 'Response format',
            required: false,
            schema: {
              type: 'string',
              enum: ['csv', 'json'],
              default: 'csv'
            }
          }
        ],
        responses: {
          200: {
            description: 'Production data template generated successfully',
            content: {
              'text/csv': {
                schema: {
                  type: 'string',
                  format: 'binary',
                  description: 'CSV file with metadata rows, header, and sample data'
                },
                example: `location_name,Solar Farm Site A
location_guid,xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
time_aggregation,hourly
start_date,2025-09-14
end_date,2025-09-21
timestamp,production,capacity_factor,availability
2025-09-14 00:00:00+03:00,0.0,0.0,1.0
2025-09-14 01:00:00+03:00,0.0,0.0,1.0`
              },
              'application/json': {
                schema: { $ref: '#/components/schemas/ProductionDataTemplate' }
              }
            }
          },
          400: {
            description: 'Bad request - Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  message: 'Invalid request parameters',
                  details: [
                    {
                      code: 'invalid_string',
                      expected: 'YYYY-MM-DD format',
                      received: '2025/09/14',
                      path: ['start_date'],
                      message: 'Date must be in YYYY-MM-DD format'
                    }
                  ]
                }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  message: 'Internal server error while generating template',
                  details: 'Template generation failed'
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      CreateLocationRequest: {
        type: 'object',
        required: ['name', 'coordinates'],
        properties: {
          name: {
            type: 'string',
            description: 'Name of the location',
            minLength: 1,
            example: 'Solar Farm Alpha'
          },
          coordinates: { $ref: '#/components/schemas/GeoPoint' },
          basic: { $ref: '#/components/schemas/BasicConfig' },
          panel: { $ref: '#/components/schemas/PanelConfig' },
          inverter: { $ref: '#/components/schemas/InverterConfig' },
          performance: { $ref: '#/components/schemas/WeatherDependentPerformance' }
        }
      },
      UpdateLocationRequest: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the location',
            minLength: 1
          },
          coordinates: { $ref: '#/components/schemas/GeoPoint' },
          basic: { $ref: '#/components/schemas/BasicConfig' },
          panel: { $ref: '#/components/schemas/PanelConfig' },
          inverter: { $ref: '#/components/schemas/InverterConfig' },
          performance: { $ref: '#/components/schemas/WeatherDependentPerformance' }
        }
      },
      GeoPoint: {
        type: 'object',
        required: ['latitude', 'longitude'],
        properties: {
          latitude: {
            type: 'number',
            minimum: -90,
            maximum: 90,
            description: 'Latitude in decimal degrees',
            example: 45.5
          },
          longitude: {
            type: 'number',
            minimum: -180,
            maximum: 180,
            description: 'Longitude in decimal degrees',
            example: -73.6
          }
        }
      },
      BasicConfig: {
        type: 'object',
        properties: {
          capacity_mw: {
            type: 'number',
            description: 'Capacity in megawatts',
            example: 10.5
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'maintenance'],
            description: 'Current status of the location',
            example: 'active'
          },
          commissioned_date: {
            type: 'string',
            format: 'date',
            description: 'Date when the location was commissioned',
            example: '2024-01-15'
          }
        }
      },
      PanelConfig: {
        type: 'object',
        properties: {
          panel_type: {
            type: 'string',
            description: 'Type of solar panel',
            example: 'Monocrystalline'
          },
          panel_count: {
            type: 'integer',
            description: 'Number of panels',
            example: 1000
          },
          panel_wattage: {
            type: 'number',
            description: 'Wattage per panel',
            example: 400
          },
          tilt_angle: {
            type: 'number',
            description: 'Tilt angle in degrees',
            example: 30
          },
          azimuth: {
            type: 'number',
            description: 'Azimuth angle in degrees',
            example: 180
          }
        }
      },
      InverterConfig: {
        type: 'object',
        properties: {
          inverter_type: {
            type: 'string',
            description: 'Type of inverter',
            example: 'String Inverter'
          },
          inverter_count: {
            type: 'integer',
            description: 'Number of inverters',
            example: 10
          },
          inverter_capacity_kw: {
            type: 'number',
            description: 'Capacity per inverter in kilowatts',
            example: 100
          }
        }
      },
      WeatherDependentPerformance: {
        type: 'object',
        properties: {
          temperature_coefficient: {
            type: 'number',
            description: 'Temperature coefficient (%/°C)',
            example: -0.4
          },
          degradation_rate: {
            type: 'number',
            description: 'Annual degradation rate (%)',
            example: 0.5
          }
        }
      },
      Location: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique identifier (GUID)',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          name: {
            type: 'string',
            description: 'Location name',
            example: 'Solar Farm Alpha'
          },
          coordinates: { $ref: '#/components/schemas/GeoPoint' },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'maintenance'],
            example: 'active'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:00:00Z'
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:00:00Z'
          }
        }
      },
      WeatherData: {
        type: 'object',
        required: ['id', 'locationId', 'timestamp', 'temperatureC', 'humidity', 'ghiWM2'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Weather data record GUID',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          locationId: {
            type: 'string',
            format: 'uuid',
            description: 'Location GUID',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'UTC timestamp of the weather data',
            example: '2023-11-14T12:00:00Z'
          },
          temperatureC: {
            type: 'number',
            description: 'Temperature in degrees Celsius',
            minimum: -50,
            maximum: 60,
            example: 25.5
          },
          humidity: {
            type: 'number',
            description: 'Relative humidity as percentage (0-100)',
            minimum: 0,
            maximum: 100,
            example: 65.2
          },
          pressureMb: {
            type: 'number',
            nullable: true,
            description: 'Atmospheric pressure in millibars',
            minimum: 900,
            maximum: 1100,
            example: 1013.25
          },
          windSpeedMs: {
            type: 'number',
            nullable: true,
            description: 'Wind speed in meters per second',
            minimum: 0,
            maximum: 100,
            example: 5.2
          },
          windDirection: {
            type: 'integer',
            nullable: true,
            description: 'Wind direction in degrees (0-360)',
            minimum: 0,
            maximum: 360,
            example: 180
          },
          cloudCover: {
            type: 'number',
            nullable: true,
            description: 'Cloud cover percentage (0-100)',
            minimum: 0,
            maximum: 100,
            example: 25.5
          },
          ghiWM2: {
            type: 'number',
            description: 'Global Horizontal Irradiance in W/m²',
            minimum: 0,
            maximum: 1500,
            example: 850.5
          },
          dniWM2: {
            type: 'number',
            nullable: true,
            description: 'Direct Normal Irradiance in W/m²',
            minimum: 0,
            maximum: 1200,
            example: 750.2
          },
          dhiWM2: {
            type: 'number',
            nullable: true,
            description: 'Diffuse Horizontal Irradiance in W/m²',
            minimum: 0,
            maximum: 800,
            example: 100.3
          },
          gtiWM2: {
            type: 'number',
            nullable: true,
            description: 'Global Tilted Irradiance in W/m²',
            minimum: 0,
            maximum: 1500,
            example: 920.1
          },
          dataSource: {
            type: 'string',
            description: 'Data source identifier',
            example: 'open-meteo'
          },
          quality: {
            type: 'string',
            description: 'Data quality indicator',
            enum: ['GOOD', 'ESTIMATED', 'POOR'],
            example: 'GOOD'
          },
          isForecast: {
            type: 'boolean',
            description: 'Whether this is forecast data (true) or historical/current (false)',
            example: false
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Record creation timestamp',
            example: '2023-11-14T12:05:00Z'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Record last update timestamp',
            example: '2023-11-14T12:05:00Z'
          }
        }
      },
      SyncWeatherRequest: {
        type: 'object',
        required: ['locationId'],
        properties: {
          locationId: {
            type: 'string',
            format: 'uuid',
            description: 'GUID of the location to sync weather data for',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          syncCurrent: {
            type: 'boolean',
            description: 'Whether to sync current weather data',
            default: true,
            example: true
          },
          syncForecast: {
            type: 'boolean',
            description: 'Whether to sync forecast data',
            default: true,
            example: true
          },
          forecastDays: {
            type: 'integer',
            description: 'Number of forecast days to sync (1-16)',
            minimum: 1,
            maximum: 16,
            default: 7,
            example: 7
          }
        }
      },
      SyncWeatherResponse: {
        type: 'object',
        required: ['success', 'stats'],
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            description: 'Success message',
            example: 'Weather data synchronized successfully'
          },
          stats: {
            type: 'object',
            required: ['totalRecords', 'newRecords', 'updatedRecords'],
            properties: {
              totalRecords: {
                type: 'integer',
                description: 'Total records processed',
                example: 168
              },
              newRecords: {
                type: 'integer',
                description: 'Number of new records created',
                example: 150
              },
              updatedRecords: {
                type: 'integer',
                description: 'Number of existing records updated',
                example: 18
              },
              skippedRecords: {
                type: 'integer',
                description: 'Number of records skipped (duplicates)',
                example: 0
              }
            }
          },
          locationId: {
            type: 'string',
            format: 'uuid',
            description: 'Location GUID that was synced',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          syncedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Sync completion timestamp',
            example: '2023-11-14T12:15:00Z'
          },
          dataRange: {
            type: 'object',
            properties: {
              from: {
                type: 'string',
                format: 'date-time',
                description: 'Earliest data timestamp',
                example: '2023-11-14T00:00:00Z'
              },
              to: {
                type: 'string',
                format: 'date-time',
                description: 'Latest data timestamp',
                example: '2023-11-21T23:00:00Z'
              }
            }
          }
        }
      },
      HealthCheckResponse: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
            description: 'Overall system health status',
            example: 'healthy'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Health check execution time',
            example: '2023-11-14T12:00:00Z'
          },
          version: {
            type: 'string',
            description: 'API version',
            example: '1.0.0'
          },
          uptime: {
            type: 'string',
            description: 'System uptime',
            example: '2d 14h 32m'
          },
          checks: {
            type: 'object',
            properties: {
              database: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['healthy', 'unhealthy'],
                    example: 'healthy'
                  },
                  responseTime: {
                    type: 'number',
                    description: 'Database response time in ms',
                    example: 45.2
                  },
                  details: {
                    type: 'string',
                    description: 'Additional health check details',
                    example: 'Connection pool: 8/20 active connections'
                  }
                }
              },
              openMeteoApi: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['healthy', 'degraded', 'unhealthy'],
                    example: 'healthy'
                  },
                  responseTime: {
                    type: 'number',
                    description: 'API response time in ms',
                    example: 234.5
                  },
                  lastSync: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Last successful sync timestamp',
                    example: '2023-11-14T11:45:00Z'
                  }
                }
              },
              scheduler: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['healthy', 'degraded', 'unhealthy'],
                    example: 'healthy'
                  },
                  activeJobs: {
                    type: 'integer',
                    description: 'Number of active scheduled jobs',
                    example: 3
                  },
                  lastExecution: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Last job execution timestamp',
                    example: '2023-11-14T12:00:00Z'
                  }
                }
              }
            }
          }
        }
      },
      DashboardStats: {
        type: 'object',
        required: ['activeLocations', 'totalCapacityMW', 'currentSolarPowerWM2', 'currentTemperatureC', 'lastUpdated'],
        properties: {
          activeLocations: {
            type: 'integer',
            description: 'Number of active solar locations',
            example: 42
          },
          totalCapacityMW: {
            type: 'number',
            description: 'Total capacity across all locations in megawatts',
            example: 125.4
          },
          currentSolarPowerWM2: {
            type: 'number',
            description: 'Current solar irradiance in watts per square meter',
            example: 850
          },
          currentTemperatureC: {
            type: 'number',
            description: 'Current temperature in Celsius',
            example: 22
          },
          lastUpdated: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp when the statistics were last updated',
            example: '2024-09-14T12:53:41.000Z'
          }
        }
      },
      GenerateReportRequest: {
        type: 'object',
        required: ['reportType', 'startDate', 'endDate', 'locationIds', 'dataAggregation', 'timezone'],
        properties: {
          reportType: {
            type: 'string',
            description: 'Type of report to generate',
            enum: ['forecast_d1_plus_5'],
            example: 'forecast_d1_plus_5'
          },
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Start date for the forecast period',
            example: '2024-01-01'
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'End date for the forecast period',
            example: '2024-01-06'
          },
          locationIds: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid'
            },
            description: 'Array of location GUIDs to include in the forecast',
            example: ['123e4567-e89b-12d3-a456-426614174000', '456e7890-a12b-34c5-d678-901234567890']
          },
          dataAggregation: {
            type: 'string',
            enum: ['15min', '1hour', '1week', '1month'],
            description: 'Data aggregation level',
            example: '15min'
          },
          timezone: {
            type: 'string',
            enum: ['UTC-2', 'UTC-1', 'UTC+0', 'UTC+1', 'UTC+2', 'UTC+3', 'UTC+4'],
            description: 'Timezone for the forecast data',
            example: 'UTC+2'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'string',
            description: 'Error message',
            example: 'Validation failed'
          },
          details: {
            type: 'string',
            description: 'Detailed error information',
            example: 'Location name is required'
          },
          field: {
            type: 'string',
            description: 'Field that caused the error (if applicable)',
            example: 'name'
          },
          code: {
            type: 'string',
            description: 'Machine-readable error code',
            example: 'VALIDATION_ERROR',
            enum: ['BAD_REQUEST', 'NOT_FOUND', 'CONFLICT', 'VALIDATION_ERROR', 'INTERNAL_ERROR']
          }
        }
      },
      GenerateForecastRequest: {
        type: 'object',
        required: ['locationId', 'horizonHours', 'modelType'],
        properties: {
          locationId: {
            type: 'string',
            description: 'Location GUID',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          horizonHours: {
            type: 'integer',
            description: 'Forecast horizon in hours',
            enum: [24, 48, 72],
            example: 24
          },
          modelType: {
            type: 'string',
            description: 'ML model type to use',
            enum: ['catboost', 'lstm', 'xgboost', 'random_forest', 'arima', 'prophet', 'ensemble'],
            example: 'catboost'
          },
          useWeather: {
            type: 'boolean',
            description: 'Include weather data in forecast',
            default: true,
            example: true
          },
          confidenceLevel: {
            type: 'number',
            description: 'Confidence level for prediction intervals',
            minimum: 0.5,
            maximum: 0.99,
            default: 0.95,
            example: 0.95
          }
        }
      },
      ForecastResponse: {
        type: 'object',
        required: ['success', 'forecastId', 'data', 'metadata'],
        properties: {
          success: { type: 'boolean', example: true },
          forecastId: { type: 'string', example: 'task_1234567890' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/ForecastDataPoint' }
          },
          metadata: { $ref: '#/components/schemas/ForecastMetadata' }
        }
      },
      ForecastDataPoint: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          powerForecastMw: { type: 'number', description: 'Forecasted power in MW' },
          confidenceScore: { type: 'number', description: 'Prediction confidence (0-1)' }
        }
      },
      ForecastMetadata: {
        type: 'object',
        properties: {
          generatedAt: { type: 'string', format: 'date-time' },
          modelType: { type: 'string' },
          horizonHours: { type: 'integer' },
          dataPoints: { type: 'integer' }
        }
      },
      WorkerStatusResponse: {
        type: 'object',
        required: ['success', 'status'],
        properties: {
          success: { type: 'boolean', example: true },
          status: {
            type: 'string',
            enum: ['connected', 'disconnected', 'error'],
            example: 'connected'
          },
          worker_url: { type: 'string', example: 'http://localhost:8001' },
          worker_health: { type: 'object', description: 'Health status from Python worker' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      BulkForecastRequest: {
        type: 'object',
        required: ['location_ids'],
        properties: {
          location_ids: {
            type: 'array',
            items: { type: 'integer' },
            description: 'Array of location IDs',
            example: [1, 2, 3]
          },
          forecast_hours: {
            type: 'integer',
            enum: [24, 48, 72],
            default: 24,
            example: 24
          },
          model_type: {
            type: 'string',
            enum: ['catboost', 'lstm', 'xgboost'],
            default: 'catboost',
            example: 'catboost'
          }
        }
      },
      BulkForecastResponse: {
        type: 'object',
        required: ['success', 'task_id'],
        properties: {
          success: { type: 'boolean', example: true },
          task_id: { type: 'string', example: 'bulk_task_1234567890' },
          locations: {
            type: 'array',
            items: { type: 'integer' }
          },
          forecast_hours: { type: 'integer' },
          model_type: { type: 'string' },
          status: { type: 'string', example: 'initiated' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      BulkForecastStatusResponse: {
        type: 'object',
        required: ['success', 'task_id', 'status'],
        properties: {
          success: { type: 'boolean', example: true },
          task_id: { type: 'string' },
          status: {
            type: 'string',
            enum: ['pending', 'running', 'completed', 'failed'],
            example: 'running'
          },
          progress: { type: 'object', description: 'Progress information' },
          results: { type: 'object', description: 'Results if completed' },
          error: { type: 'string', description: 'Error message if failed' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      ValidateForecastRequest: {
        type: 'object',
        required: ['location_id'],
        properties: {
          location_id: {
            type: 'integer',
            description: 'Location ID',
            example: 1
          },
          forecast_hours: {
            type: 'integer',
            enum: [24, 48, 72],
            default: 24,
            example: 24
          },
          model_type: {
            type: 'string',
            enum: ['catboost', 'lstm', 'xgboost', 'random_forest', 'arima', 'prophet', 'ensemble'],
            default: 'catboost',
            example: 'catboost'
          }
        }
      },
      ValidationResponse: {
        type: 'object',
        required: ['success', 'validation'],
        properties: {
          success: { type: 'boolean', example: true },
          validation: {
            type: 'object',
            properties: {
              parameters: { type: 'string', example: 'valid' },
              location: { type: 'string', example: 'exists' },
              worker_connection: { type: 'string', example: 'healthy' },
              data_quality: { type: 'object', description: 'Data quality information' }
            }
          },
          request_summary: { type: 'object', description: 'Summary of validated request' },
          recommendations: {
            type: 'array',
            items: { type: 'string' },
            description: 'Recommendations for forecast generation'
          }
        }
      },
      ModelsResponse: {
        type: 'object',
        required: ['success', 'models'],
        properties: {
          success: { type: 'boolean', example: true },
          models: {
            type: 'array',
            items: { $ref: '#/components/schemas/ModelInfo' }
          },
          source: {
            type: 'string',
            enum: ['python_worker', 'fallback'],
            example: 'python_worker'
          },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      ModelInfo: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'catboost' },
          name: { type: 'string', example: 'CatBoost' },
          description: { type: 'string', example: 'Gradient boosting with quantile regression' },
          status: {
            type: 'string',
            enum: ['available', 'unavailable', 'deprecated'],
            example: 'available'
          },
          confidence: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            example: 'high'
          },
          best_for: { type: 'string', example: 'General purpose forecasting' }
        }
      },
      TestModelRequest: {
        type: 'object',
        required: ['model_type', 'location_id'],
        properties: {
          model_type: { type: 'string', example: 'catboost' },
          location_id: { type: 'integer', example: 1 }
        }
      },
      ModelTestResponse: {
        type: 'object',
        required: ['success', 'model_type', 'status'],
        properties: {
          success: { type: 'boolean', example: true },
          model_type: { type: 'string', example: 'catboost' },
          status: {
            type: 'string',
            enum: ['working', 'failed', 'error'],
            example: 'working'
          },
          test_result: {
            type: 'object',
            properties: {
              forecast_points: { type: 'integer', example: 24 },
              confidence_range: { type: 'string', example: '0.95' },
              processing_time: { type: 'string', example: '2.3s' }
            }
          },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      GenerateTemplateRequest: {
        type: 'object',
        required: ['start_date', 'end_date'],
        properties: {
          location_name: {
            type: 'string',
            description: 'Name of the solar location',
            default: 'Solar Farm Site A',
            example: 'Solar Farm Alpha'
          },
          location_guid: {
            type: 'string',
            description: 'GUID placeholder for the location',
            default: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          time_aggregation: {
            type: 'string',
            enum: ['15min', 'hourly', 'daily'],
            description: 'Time aggregation level for the data',
            default: 'hourly'
          },
          start_date: {
            type: 'string',
            format: 'date',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            description: 'Start date for the template data range',
            example: '2025-09-14'
          },
          end_date: {
            type: 'string',
            format: 'date',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            description: 'End date for the template data range',
            example: '2025-09-21'
          },
          timezone: {
            type: 'string',
            pattern: '^[+-]\\d{2}:\\d{2}$',
            description: 'Timezone in ±HH:MM format',
            default: '+03:00',
            example: '+03:00'
          },
          format: {
            type: 'string',
            enum: ['csv', 'json'],
            description: 'Response format',
            default: 'csv'
          }
        }
      },
      ProductionDataTemplate: {
        type: 'object',
        required: ['metadata', 'data'],
        properties: {
          metadata: { $ref: '#/components/schemas/ProductionDataMetadata' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/ProductionDataRow' }
          }
        }
      },
      ProductionDataMetadata: {
        type: 'object',
        required: ['location_name', 'location_guid', 'time_aggregation', 'start_date', 'end_date'],
        properties: {
          location_name: {
            type: 'string',
            description: 'Name of the solar location',
            example: 'Solar Farm Site A'
          },
          location_guid: {
            type: 'string',
            description: 'GUID of the location',
            example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
          },
          time_aggregation: {
            type: 'string',
            enum: ['15min', 'hourly', 'daily'],
            description: 'Time aggregation level',
            example: 'hourly'
          },
          start_date: {
            type: 'string',
            format: 'date',
            description: 'Start date of the data range',
            example: '2025-09-14'
          },
          end_date: {
            type: 'string',
            format: 'date',
            description: 'End date of the data range',
            example: '2025-09-21'
          }
        }
      },
      ProductionDataRow: {
        type: 'object',
        required: ['timestamp', 'production', 'capacity_factor', 'availability'],
        properties: {
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp with UTC offset in YYYY-MM-DD HH:MM:SS±HH:MM format',
            example: '2025-09-14 12:00:00+03:00'
          },
          production: {
            type: 'number',
            format: 'float',
            description: 'Actual energy produced during interval in MWh',
            minimum: 0,
            example: 35.2
          },
          capacity_factor: {
            type: 'number',
            format: 'float',
            description: 'Ratio of actual production to maximum capacity (0.0 - 1.0)',
            minimum: 0,
            maximum: 1,
            example: 0.98
          },
          availability: {
            type: 'number',
            format: 'float',
            description: 'System availability ratio (0.0 - 1.0)',
            minimum: 0,
            maximum: 1,
            example: 1.0
          }
        }
      }
    }
  }
};