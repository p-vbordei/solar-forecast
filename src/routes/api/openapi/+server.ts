import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Solar Forecast Platform API",
    description: `Backend API for the Solar Forecast Platform providing endpoints for locations management,
solar forecasting, and Excel report generation.

## Features
- **Locations Management**: CRUD operations for solar farm locations
- **Reports Export**: Generate Excel reports with multiple template modes
- **TimescaleDB Integration**: Optimized for time-series data

## Authentication
Currently in development mode. Production deployment will require authentication.`,
    version: "1.0.0",
    contact: {
      name: "Solar Forecast Platform",
      url: "https://github.com/your-org/solar-forecast"
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT"
    }
  },
  servers: [
    {
      url: "http://localhost:5173/api",
      description: "Development server"
    }
  ],
  paths: {
    "/reports": {
      get: {
        summary: "Generate Excel Report",
        description: `Generate and download Excel reports based on template and date range.

## Template Modes

### FILE Mode Templates
- \`template_1\`: Standard production report with predefined Excel template
  - Loads from \`/static/reports/template_1.xlsx\`
  - Columns: Timestamp | Site | Qty | Price | Total
  - Includes formulas and formatting

### CODE Mode Templates
- \`template_code_1\`: Advanced report built programmatically
  - Multiple worksheets (Report Data + Summary)
  - Advanced styling and conditional formatting
  - Auto-filters and frozen headers

## Data Source
Currently uses mock data service generating realistic time-series data.
Production version will connect to real solar production databases.

## Performance
- FILE mode: ~25ms for 24 hours of data
- CODE mode: ~7ms for 48 hours of data
- Supports up to 1000 rows in v1 (buffered generation)`,
        operationId: "generateReport",
        tags: ["Reports"],
        parameters: [
          {
            name: "template",
            in: "query",
            required: true,
            description: "Template name for report generation",
            schema: {
              type: "string",
              enum: ["template_1", "template_code_1"]
            },
            example: "template_1"
          },
          {
            name: "from",
            in: "query",
            required: true,
            description: "Start date/time in ISO 8601 format",
            schema: {
              type: "string",
              format: "date-time"
            },
            example: "2025-01-01T00:00:00Z"
          },
          {
            name: "to",
            in: "query",
            required: true,
            description: "End date/time in ISO 8601 format (must be >= from)",
            schema: {
              type: "string",
              format: "date-time"
            },
            example: "2025-01-02T00:00:00Z"
          },
          {
            name: "tz",
            in: "query",
            required: false,
            description: "IANA timezone for data processing",
            schema: {
              type: "string",
              default: "Europe/Bucharest"
            },
            example: "America/New_York"
          }
        ],
        responses: {
          "200": {
            description: "Excel file generated successfully",
            headers: {
              "Content-Type": {
                description: "Excel MIME type",
                schema: {
                  type: "string",
                  example: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                }
              },
              "Content-Disposition": {
                description: "Attachment with filename",
                schema: {
                  type: "string",
                  example: 'attachment; filename="report_template_1_20250101-0000_20250102-0000.xlsx"'
                }
              },
              "Content-Length": {
                description: "File size in bytes",
                schema: {
                  type: "integer",
                  example: 7931
                }
              }
            },
            content: {
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
                schema: {
                  type: "string",
                  format: "binary",
                  description: "Excel file (.xlsx format)"
                }
              }
            }
          },
          "400": {
            description: "Bad Request - Invalid parameters",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse"
                },
                examples: {
                  missing_template: {
                    summary: "Missing template parameter",
                    value: {
                      success: false,
                      error: "Missing ?template parameter",
                      field: "template",
                      code: "BAD_REQUEST"
                    }
                  },
                  unknown_template: {
                    summary: "Unknown template",
                    value: {
                      success: false,
                      error: "Unknown template: invalid_template",
                      field: "template",
                      code: "BAD_REQUEST"
                    }
                  },
                  invalid_date_range: {
                    summary: "Invalid date range",
                    value: {
                      success: false,
                      error: "?from must be <= ?to",
                      field: "from",
                      code: "BAD_REQUEST"
                    }
                  }
                }
              }
            }
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse"
                },
                example: {
                  success: false,
                  error: "Internal server error",
                  code: "INTERNAL_ERROR"
                }
              }
            }
          }
        }
      }
    },
    "/locations": {
      get: {
        summary: "Get All Locations",
        description: "Retrieve all solar farm locations with optional filtering and pagination",
        operationId: "getAllLocations",
        tags: ["Locations"],
        parameters: [
          {
            name: "search",
            in: "query",
            description: "Search term for name, city, region, or address",
            schema: { type: "string" },
            example: "Solar Farm"
          },
          {
            name: "status",
            in: "query",
            description: "Filter by location status",
            schema: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE", "MAINTENANCE", "DECOMMISSIONED"]
            },
            example: "ACTIVE"
          },
          {
            name: "limit",
            in: "query",
            description: "Number of results per page (1-100)",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 50
            },
            example: 20
          },
          {
            name: "offset",
            in: "query",
            description: "Number of results to skip",
            schema: {
              type: "integer",
              minimum: 0,
              default: 0
            },
            example: 0
          }
        ],
        responses: {
          "200": {
            description: "Locations retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LocationListResponse"
                }
              }
            }
          },
          "400": {
            description: "Bad Request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      },
      post: {
        summary: "Create Location",
        description: "Create a new solar farm location",
        operationId: "createLocation",
        tags: ["Locations"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateLocationRequest"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Location created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LocationResponse"
                }
              }
            }
          },
          "400": {
            description: "Bad Request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse"
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
      ErrorResponse: {
        type: "object",
        required: ["success", "error", "code"],
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "Missing ?template parameter" },
          field: { type: "string", example: "template" },
          details: { type: "string" },
          code: {
            type: "string",
            example: "BAD_REQUEST",
            enum: ["BAD_REQUEST", "NOT_FOUND", "CONFLICT", "UNAUTHORIZED", "INTERNAL_ERROR"]
          }
        }
      },
      LocationListResponse: {
        type: "object",
        required: ["success", "data", "pagination", "filters"],
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/LocationSummary" }
          },
          pagination: { $ref: "#/components/schemas/PaginationInfo" },
          filters: { $ref: "#/components/schemas/FilterInfo" }
        }
      },
      LocationResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", example: true },
          data: { $ref: "#/components/schemas/Location" },
          message: { type: "string", example: "Location created successfully" }
        }
      },
      Location: {
        type: "object",
        required: ["id", "name", "code", "latitude", "longitude", "capacityMW", "status", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid", example: "2b2bb2ba-48be-4a83-ae5b-5d6babc2b795" },
          name: { type: "string", example: "Solar Farm A" },
          code: { type: "string", example: "solar_farm_a_123456" },
          latitude: { type: "number", format: "double", example: 45.5 },
          longitude: { type: "number", format: "double", example: -73.6 },
          city: { type: "string", nullable: true, example: "Montreal" },
          region: { type: "string", nullable: true, example: "Quebec" },
          country: { type: "string", nullable: true, example: "Canada" },
          capacityMW: { type: "number", format: "double", example: 10.5 },
          status: {
            type: "string",
            enum: ["ACTIVE", "INACTIVE", "MAINTENANCE", "DECOMMISSIONED"],
            example: "ACTIVE"
          },
          installationDate: { type: "string", format: "date", nullable: true, example: "2024-01-15" },
          createdAt: { type: "string", format: "date-time", example: "2025-09-13T17:59:15.911Z" },
          updatedAt: { type: "string", format: "date-time", example: "2025-09-13T17:59:15.911Z" },
          client: {
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              name: { type: "string", example: "Solar Energy Corp" }
            }
          }
        }
      },
      LocationSummary: {
        type: "object",
        required: ["id", "name", "code", "latitude", "longitude", "capacityMW", "status"],
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          code: { type: "string" },
          latitude: { type: "number", format: "double" },
          longitude: { type: "number", format: "double" },
          city: { type: "string", nullable: true },
          region: { type: "string", nullable: true },
          country: { type: "string", nullable: true },
          capacityMW: { type: "number", format: "double" },
          status: {
            type: "string",
            enum: ["ACTIVE", "INACTIVE", "MAINTENANCE", "DECOMMISSIONED"]
          },
          installationDate: { type: "string", format: "date", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          client: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string" }
            }
          }
        }
      },
      CreateLocationRequest: {
        type: "object",
        required: ["name", "coordinates"],
        properties: {
          name: { type: "string", example: "Solar Farm B" },
          coordinates: {
            type: "object",
            required: ["latitude", "longitude"],
            properties: {
              latitude: { type: "number", format: "double", minimum: -90, maximum: 90, example: 45.5 },
              longitude: { type: "number", format: "double", minimum: -180, maximum: 180, example: -73.6 }
            }
          },
          basic: {
            type: "object",
            properties: {
              capacity_mw: { type: "number", format: "double", minimum: 0, example: 10.5 },
              status: { type: "string", example: "active" }
            }
          }
        }
      },
      PaginationInfo: {
        type: "object",
        required: ["total", "size", "current"],
        properties: {
          total: { type: "integer", description: "Total number of records", example: 125 },
          size: { type: "integer", description: "Page size", example: 50 },
          current: { type: "integer", description: "Current page number (1-based)", example: 1 }
        }
      },
      FilterInfo: {
        type: "object",
        properties: {
          search: { type: "string", nullable: true, example: "Solar Farm" },
          status: { type: "string", nullable: true, example: "ACTIVE" }
        }
      }
    }
  },
  tags: [
    { name: "Reports", description: "Excel report generation endpoints" },
    { name: "Locations", description: "Solar farm location management" }
  ]
};

export const GET: RequestHandler = async () => {
    return json(openApiSpec);
};