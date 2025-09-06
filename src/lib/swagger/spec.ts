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
      name: 'Locations',
      description: 'Solar panel location management'
    }
  ],
  paths: {
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
      }
    }
  }
};