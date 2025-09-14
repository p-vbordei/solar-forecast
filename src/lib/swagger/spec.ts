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
      name: 'Reports',
      description: 'Report generation and management'
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
    '/api/reports/recent': {
      get: {
        tags: ['Reports'],
        summary: 'Get recent reports',
        description: 'Retrieve a list of recently generated reports',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of reports to return',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 10
            }
          }
        ],
        responses: {
          200: {
            description: 'Recent reports retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ReportSummary' }
                    }
                  }
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
    '/api/reports/export': {
      post: {
        tags: ['Reports'],
        summary: 'Export report data',
        description: 'Export report data in various formats (PDF, Excel, CSV)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ExportReportRequest' },
              example: {
                reportType: 'forecast_d1_plus_5',
                startDate: '2024-01-01',
                endDate: '2024-01-06',
                locationIds: ['123e4567-e89b-12d3-a456-426614174000'],
                dataAggregation: '15min',
                timezone: 'UTC+2',
                format: 'excel'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Report exported successfully',
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
            description: 'Bad request - Missing required fields',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: 'Missing required fields',
                  code: 'BAD_REQUEST'
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
      ExportReportRequest: {
        type: 'object',
        required: ['reportType', 'startDate', 'endDate', 'locationIds', 'dataAggregation', 'timezone', 'format'],
        properties: {
          reportType: {
            type: 'string',
            description: 'Type of report to export',
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
            example: ['123e4567-e89b-12d3-a456-426614174000']
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
          },
          format: {
            type: 'string',
            description: 'Export format',
            enum: ['excel', 'csv'],
            example: 'excel'
          }
        }
      },
      Report: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique report identifier',
            example: '789a0123-b456-78c9-d012-345678901234'
          },
          reportType: {
            type: 'string',
            description: 'Type of report',
            example: 'production-summary'
          },
          startDate: {
            type: 'string',
            format: 'date',
            example: '2024-01-01'
          },
          endDate: {
            type: 'string',
            format: 'date',
            example: '2024-01-31'
          },
          format: {
            type: 'string',
            example: 'pdf'
          },
          status: {
            type: 'string',
            enum: ['pending', 'generating', 'completed', 'failed'],
            description: 'Report generation status',
            example: 'completed'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:00:00Z'
          },
          completedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:05:00Z'
          },
          fileSize: {
            type: 'integer',
            description: 'File size in bytes',
            example: 1048576
          },
          downloadUrl: {
            type: 'string',
            description: 'URL to download the report',
            example: '/api/reports/789a0123-b456-78c9-d012-345678901234'
          }
        }
      },
      ReportSummary: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique report identifier',
            example: '789a0123-b456-78c9-d012-345678901234'
          },
          reportType: {
            type: 'string',
            description: 'Type of report',
            example: 'production-summary'
          },
          title: {
            type: 'string',
            description: 'Report title',
            example: 'Production Report - January 2024'
          },
          dateRange: {
            type: 'string',
            description: 'Report date range',
            example: 'Jan 1, 2024 - Jan 31, 2024'
          },
          format: {
            type: 'string',
            example: 'pdf'
          },
          status: {
            type: 'string',
            enum: ['pending', 'generating', 'completed', 'failed'],
            example: 'completed'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:00:00Z'
          },
          fileSize: {
            type: 'string',
            description: 'Human-readable file size',
            example: '1.05 MB'
          }
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