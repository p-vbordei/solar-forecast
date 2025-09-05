import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { HistoricalService } from '$lib/server/services/historical.service';
import { HistoricalRepository } from '$lib/server/repositories/historical.repository';
import type { HistoricalDataRequest, ExportConfig } from '$lib/types/historical';
import { AggregationType, DataQualityFilter, ExportFormat, ChartType } from '$lib/types/historical';

// Initialize service with CSR pattern
const historicalRepository = new HistoricalRepository();
const historicalService = new HistoricalService(historicalRepository);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body || typeof body !== 'object') {
      return json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate required fields for export
    if (!body.startDate || !body.endDate || (!body.locationIds && !body.locationId)) {
      return json(
        { 
          success: false, 
          error: 'Missing required fields: startDate, endDate, and locationIds/locationId' 
        },
        { status: 400 }
      );
    }

    // Build historical data request
    const historicalRequest: HistoricalDataRequest = {
      locationIds: body.locationIds || (body.locationId ? [body.locationId] : []),
      startDate: body.startDate,
      endDate: body.endDate,
      timezone: body.timezone || 'UTC',
      aggregation: body.aggregation || AggregationType.HOURLY,
      includeProduction: body.includeProduction !== false, // Default true
      includeWeather: body.includeWeather || false,
      includeForecast: body.includeForecast || false,
      includeAccuracy: body.includeAccuracy || false,
      includeMetadata: body.includeMetadata !== false, // Default true for exports
      dataQualityFilter: body.dataQualityFilter || [DataQualityFilter.EXCLUDE_POOR],
      minCapacityFactor: body.minCapacityFactor,
      maxCapacityFactor: body.maxCapacityFactor
    };

    // Build export configuration
    const exportConfig: ExportConfig = {
      format: body.format || ExportFormat.CSV,
      filename: body.filename,
      includeCharts: body.includeCharts || false,
      includeMetadata: body.includeMetadata !== false, // Default true
      includeStatistics: body.includeStatistics || false,
      customColumns: body.customColumns,
      chartTypes: body.chartTypes || [ChartType.PRODUCTION_TIMELINE],
      compression: body.compression || false
    };

    // Validate export format
    if (!Object.values(ExportFormat).includes(exportConfig.format)) {
      return json(
        { success: false, error: `Unsupported export format: ${exportConfig.format}` },
        { status: 400 }
      );
    }

    // Export data using service
    const exportResult = await historicalService.exportHistoricalData(historicalRequest, exportConfig);

    if (!exportResult.success) {
      return json(
        { success: false, error: exportResult.error },
        { status: 500 }
      );
    }

    // Handle different response types based on format
    switch (exportConfig.format) {
      case ExportFormat.CSV:
        return new Response(exportResult.data, {
          headers: {
            'Content-Type': exportResult.contentType!,
            'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
            'Cache-Control': 'no-cache'
          }
        });

      case ExportFormat.JSON:
        return new Response(exportResult.data, {
          headers: {
            'Content-Type': exportResult.contentType!,
            'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
            'Cache-Control': 'no-cache'
          }
        });

      case ExportFormat.EXCEL:
        // For Excel, we return a JSON response with the data structure
        // In a real implementation, this would generate an actual Excel file
        return json({
          success: true,
          message: 'Excel export prepared',
          downloadUrl: `/api/analysis/historical/export/download/${generateDownloadToken()}`,
          filename: exportResult.filename,
          format: 'excel',
          data: exportResult.data // For development, return the data structure
        });

      case ExportFormat.PDF:
        // For PDF, we return a JSON response with the data structure
        // In a real implementation, this would generate an actual PDF file
        return json({
          success: true,
          message: 'PDF export prepared',
          downloadUrl: `/api/analysis/historical/export/download/${generateDownloadToken()}`,
          filename: exportResult.filename,
          format: 'pdf',
          data: exportResult.data // For development, return the data structure
        });

      default:
        return json(
          { success: false, error: 'Unsupported export format' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Historical data export error:', error);
    
    let errorMessage = 'Export failed';
    if (error instanceof Error) {
      if (error.message.includes('Invalid date range')) {
        errorMessage = 'Invalid date range. Ensure start date is before end date and within limits.';
      } else if (error.message.includes('location')) {
        errorMessage = 'Invalid location ID. Ensure locations exist and you have access.';
      } else if (error.message.includes('format')) {
        errorMessage = error.message; // Pass through format error messages
      } else {
        errorMessage = error.message;
      }
    }

    return json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
};

// GET endpoint for template download and format information
export const GET: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action');
    const format = url.searchParams.get('format');

    switch (action) {
      case 'formats':
        // Return available export formats and their capabilities
        return json({
          success: true,
          formats: [
            {
              format: 'csv',
              name: 'CSV (Comma Separated Values)',
              description: 'Standard CSV format suitable for Excel and data analysis',
              supportsCharts: false,
              supportsMetadata: true,
              maxRows: 1000000,
              contentType: 'text/csv'
            },
            {
              format: 'excel',
              name: 'Excel Workbook (.xlsx)',
              description: 'Excel format with multiple sheets, charts, and formatting',
              supportsCharts: true,
              supportsMetadata: true,
              maxRows: 100000,
              contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            {
              format: 'json',
              name: 'JSON (JavaScript Object Notation)',
              description: 'Structured JSON format for API consumption',
              supportsCharts: false,
              supportsMetadata: true,
              maxRows: 500000,
              contentType: 'application/json'
            },
            {
              format: 'pdf',
              name: 'PDF Report',
              description: 'Professional PDF report with charts and summary statistics',
              supportsCharts: true,
              supportsMetadata: true,
              maxRows: 10000,
              contentType: 'application/pdf'
            }
          ]
        });

      case 'template':
        // Return a template for the specified format
        if (!format) {
          return json(
            { success: false, error: 'Format parameter required for template' },
            { status: 400 }
          );
        }

        const template = generateExportTemplate(format);
        if (!template) {
          return json(
            { success: false, error: `Template not available for format: ${format}` },
            { status: 400 }
          );
        }

        return json({
          success: true,
          template,
          description: `Export template for ${format} format`
        });

      case 'columns':
        // Return available columns for custom export
        return json({
          success: true,
          columns: getAvailableExportColumns()
        });

      default:
        return json({
          success: true,
          message: 'Historical Data Export API',
          endpoints: {
            'POST /': 'Export historical data',
            'GET /?action=formats': 'Get available export formats',
            'GET /?action=template&format={format}': 'Get export template',
            'GET /?action=columns': 'Get available columns'
          },
          supportedFormats: ['csv', 'excel', 'json', 'pdf'],
          maxDateRange: '5 years',
          maxLocations: 100
        });
    }

  } catch (error) {
    console.error('Export API GET error:', error);
    return json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
};

// Utility functions
function generateDownloadToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function generateExportTemplate(format: string): any {
  switch (format.toLowerCase()) {
    case 'csv':
      return {
        headers: [
          'timestamp',
          'location_id',
          'location_name',
          'power_mw',
          'energy_mwh',
          'capacity_factor',
          'performance_ratio',
          'efficiency',
          'availability',
          'ghi',
          'temperature',
          'wind_speed',
          'data_quality'
        ],
        sampleRow: [
          '2024-01-15T10:00:00Z',
          '1',
          'Solar Farm Alpha',
          '45.2',
          '11.3',
          '0.85',
          '0.92',
          '18.5',
          '1.0',
          '650',
          '25.3',
          '3.2',
          'good'
        ],
        notes: [
          'Timestamp must be in ISO 8601 format',
          'Power values in MW, energy in MWh',
          'Ratios and efficiency as decimal values',
          'Temperature in Celsius, wind speed in m/s'
        ]
      };

    case 'json':
      return {
        structure: {
          success: true,
          data: [
            {
              timestamp: '2024-01-15T10:00:00Z',
              locationId: 1,
              locationName: 'Solar Farm Alpha',
              production: {
                powerMW: 45.2,
                energyMWh: 11.3,
                capacityFactor: 0.85,
                performanceRatio: 0.92,
                efficiency: 18.5,
                availability: 1.0
              },
              weather: {
                ghi: 650,
                temperature: 25.3,
                windSpeed: 3.2
              },
              dataQuality: {
                overall: 'good'
              }
            }
          ],
          metadata: {
            totalRecords: 1,
            exportedAt: '2024-01-15T10:30:00Z'
          }
        }
      };

    case 'excel':
      return {
        sheets: [
          {
            name: 'Production Data',
            columns: ['Timestamp', 'Location', 'Power (MW)', 'Energy (MWh)', 'Capacity Factor'],
            description: 'Main production data with key performance metrics'
          },
          {
            name: 'Weather Data',
            columns: ['Timestamp', 'Location', 'GHI (W/m²)', 'Temperature (°C)', 'Wind Speed (m/s)'],
            description: 'Weather conditions affecting production'
          },
          {
            name: 'Summary Statistics',
            columns: ['Location', 'Total Energy', 'Average CF', 'Peak Power', 'Availability'],
            description: 'Summary statistics for the export period'
          }
        ],
        chartTypes: ['Production Timeline', 'Capacity Factor Distribution', 'Weather Correlation'],
        formatting: 'Professional formatting with conditional colors and data validation'
      };

    case 'pdf':
      return {
        sections: [
          {
            name: 'Executive Summary',
            description: 'Key performance indicators and period overview'
          },
          {
            name: 'Production Analysis',
            description: 'Detailed production analysis with charts and trends'
          },
          {
            name: 'Weather Impact',
            description: 'Weather correlation analysis and environmental factors'
          },
          {
            name: 'Data Quality Report',
            description: 'Data completeness and quality assessment'
          },
          {
            name: 'Detailed Data Tables',
            description: 'Complete data tables with all requested metrics'
          }
        ],
        chartTypes: ['Production Timeline', 'Seasonal Patterns', 'Location Comparison'],
        formatting: 'Professional report layout with company branding'
      };

    default:
      return null;
  }
}

function getAvailableExportColumns(): any {
  return {
    production: [
      { key: 'timestamp', name: 'Timestamp', type: 'datetime', required: true },
      { key: 'location_id', name: 'Location ID', type: 'integer', required: true },
      { key: 'location_name', name: 'Location Name', type: 'string', required: false },
      { key: 'power_mw', name: 'Power (MW)', type: 'float', required: true },
      { key: 'energy_mwh', name: 'Energy (MWh)', type: 'float', required: false },
      { key: 'capacity_factor', name: 'Capacity Factor', type: 'float', required: false },
      { key: 'performance_ratio', name: 'Performance Ratio', type: 'float', required: false },
      { key: 'efficiency', name: 'Efficiency (%)', type: 'float', required: false },
      { key: 'availability', name: 'Availability', type: 'float', required: false }
    ],
    weather: [
      { key: 'ghi', name: 'GHI (W/m²)', type: 'float', required: false },
      { key: 'dni', name: 'DNI (W/m²)', type: 'float', required: false },
      { key: 'dhi', name: 'DHI (W/m²)', type: 'float', required: false },
      { key: 'gti', name: 'GTI (W/m²)', type: 'float', required: false },
      { key: 'temperature', name: 'Temperature (°C)', type: 'float', required: false },
      { key: 'wind_speed', name: 'Wind Speed (m/s)', type: 'float', required: false },
      { key: 'humidity', name: 'Humidity (%)', type: 'float', required: false },
      { key: 'cloud_cover', name: 'Cloud Cover (%)', type: 'float', required: false }
    ],
    forecast: [
      { key: 'forecast_power_mw', name: 'Forecast Power (MW)', type: 'float', required: false },
      { key: 'forecast_confidence', name: 'Forecast Confidence', type: 'float', required: false },
      { key: 'forecast_q10', name: 'Forecast Q10', type: 'float', required: false },
      { key: 'forecast_q90', name: 'Forecast Q90', type: 'float', required: false }
    ],
    quality: [
      { key: 'data_quality', name: 'Data Quality', type: 'string', required: false },
      { key: 'maintenance_flag', name: 'Maintenance Flag', type: 'boolean', required: false },
      { key: 'anomaly_detected', name: 'Anomaly Detected', type: 'boolean', required: false }
    ]
  };
}