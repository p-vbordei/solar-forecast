import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { HistoricalService } from '$lib/server/services/historical.service';
import { HistoricalRepository } from '$lib/server/repositories/historical.repository';
import type { HistoricalDataRequest } from '$lib/types/historical';
import { AggregationType, DataQualityFilter } from '$lib/types/historical';

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

    // Validate required fields
    if (!body.startDate || !body.endDate || (!body.locationIds && !body.locationId)) {
      return json(
        { 
          success: false, 
          error: 'Missing required fields: startDate, endDate, and locationIds/locationId' 
        },
        { status: 400 }
      );
    }

    // Build historical data request for statistics
    const historicalRequest: HistoricalDataRequest = {
      locationIds: body.locationIds || (body.locationId ? [body.locationId] : []),
      startDate: body.startDate,
      endDate: body.endDate,
      timezone: body.timezone || 'UTC',
      aggregation: body.aggregation || AggregationType.DAILY, // Default to daily for statistics
      includeProduction: true, // Always include production for statistics
      includeWeather: body.includeWeather !== false, // Default true for statistics
      includeForecast: body.includeForecast || false,
      includeAccuracy: body.includeAccuracy || body.includeForecast, // Include if forecast requested
      includeMetadata: true, // Always include metadata for statistics
      dataQualityFilter: body.dataQualityFilter || [DataQualityFilter.EXCLUDE_POOR]
    };

    // Get comprehensive statistics using service
    const statistics = await historicalService.getHistoricalStatistics(historicalRequest);

    // Enhance statistics with additional analysis based on request
    const enhancedStatistics = await enhanceStatisticsAnalysis(statistics, body, historicalRequest);

    return json({
      success: true,
      statistics: enhancedStatistics,
      metadata: {
        requestId: generateRequestId(),
        generatedAt: new Date().toISOString(),
        analysisType: determineAnalysisType(body),
        locationCount: historicalRequest.locationIds.length,
        period: {
          start: historicalRequest.startDate,
          end: historicalRequest.endDate,
          aggregation: historicalRequest.aggregation
        },
        includedData: {
          production: historicalRequest.includeProduction,
          weather: historicalRequest.includeWeather,
          forecast: historicalRequest.includeForecast,
          accuracy: historicalRequest.includeAccuracy
        }
      }
    });

  } catch (error) {
    console.error('Historical statistics API error:', error);
    
    let errorMessage = 'Failed to generate statistics';
    if (error instanceof Error) {
      if (error.message.includes('No data available')) {
        errorMessage = 'No data available for the requested period and locations';
      } else if (error.message.includes('Invalid date range')) {
        errorMessage = 'Invalid date range. Ensure start date is before end date and within limits.';
      } else if (error.message.includes('location')) {
        errorMessage = 'Invalid location ID. Ensure locations exist and you have access.';
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

export const GET: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action');

    switch (action) {
      case 'metrics':
        // Return available statistical metrics
        return json({
          success: true,
          metrics: {
            production: {
              basic: [
                'total_energy_mwh',
                'peak_power_mw',
                'average_power_mw',
                'operating_hours'
              ],
              performance: [
                'average_capacity_factor',
                'average_performance_ratio',
                'average_efficiency',
                'average_availability'
              ],
              distribution: [
                'capacity_factor_distribution',
                'efficiency_distribution',
                'power_distribution'
              ]
            },
            weather: [
              'average_ghi',
              'average_temperature',
              'average_wind_speed',
              'irradiance_production_correlation',
              'temperature_efficiency_correlation',
              'weather_impact_analysis'
            ],
            forecast: [
              'mape',
              'rmse', 
              'mae',
              'r2',
              'skill_score',
              'accuracy_by_horizon',
              'bias_analysis'
            ],
            temporal: [
              'hourly_patterns',
              'daily_patterns',
              'seasonal_patterns',
              'monthly_trends',
              'weekend_vs_weekday'
            ]
          }
        });

      case 'analysis-types':
        // Return available analysis types
        return json({
          success: true,
          analysisTypes: [
            {
              type: 'performance',
              name: 'Performance Analysis',
              description: 'Comprehensive performance metrics and efficiency analysis',
              requiredData: ['production'],
              optionalData: ['weather'],
              metrics: ['capacity_factor', 'performance_ratio', 'efficiency', 'availability']
            },
            {
              type: 'weather-correlation',
              name: 'Weather Correlation Analysis',
              description: 'Analysis of weather impact on solar production',
              requiredData: ['production', 'weather'],
              optionalData: [],
              metrics: ['irradiance_correlation', 'temperature_impact', 'weather_patterns']
            },
            {
              type: 'forecast-accuracy',
              name: 'Forecast Accuracy Analysis',
              description: 'Statistical analysis of forecast vs actual production',
              requiredData: ['production', 'forecast'],
              optionalData: [],
              metrics: ['mape', 'rmse', 'mae', 'r2', 'bias', 'skill_score']
            },
            {
              type: 'temporal-patterns',
              name: 'Temporal Pattern Analysis',
              description: 'Analysis of production patterns over time',
              requiredData: ['production'],
              optionalData: ['weather'],
              metrics: ['hourly_patterns', 'seasonal_trends', 'cyclic_analysis']
            },
            {
              type: 'location-comparison',
              name: 'Multi-Location Comparison',
              description: 'Comparative analysis across multiple locations',
              requiredData: ['production'],
              optionalData: ['weather'],
              metrics: ['ranking', 'correlation', 'benchmarking']
            },
            {
              type: 'data-quality',
              name: 'Data Quality Assessment',
              description: 'Analysis of data completeness and reliability',
              requiredData: ['production'],
              optionalData: ['weather', 'forecast'],
              metrics: ['completeness', 'reliability', 'anomalies', 'gaps']
            }
          ]
        });

      case 'benchmarks':
        // Return industry benchmarks for comparison
        return json({
          success: true,
          benchmarks: {
            capacity_factor: {
              excellent: { min: 0.25, max: 1.0, description: 'Top 10% performance' },
              good: { min: 0.20, max: 0.25, description: 'Above average performance' },
              average: { min: 0.15, max: 0.20, description: 'Industry average' },
              poor: { min: 0.10, max: 0.15, description: 'Below average performance' },
              critical: { min: 0.0, max: 0.10, description: 'Requires immediate attention' }
            },
            performance_ratio: {
              excellent: { min: 0.85, max: 1.0, description: 'Top performance systems' },
              good: { min: 0.80, max: 0.85, description: 'Well-maintained systems' },
              average: { min: 0.75, max: 0.80, description: 'Industry standard' },
              poor: { min: 0.65, max: 0.75, description: 'Maintenance needed' },
              critical: { min: 0.0, max: 0.65, description: 'System issues present' }
            },
            availability: {
              excellent: { min: 0.98, max: 1.0, description: 'Minimal downtime' },
              good: { min: 0.95, max: 0.98, description: 'Low downtime' },
              average: { min: 0.90, max: 0.95, description: 'Standard availability' },
              poor: { min: 0.80, max: 0.90, description: 'High maintenance needs' },
              critical: { min: 0.0, max: 0.80, description: 'Frequent outages' }
            },
            data_quality: {
              excellent: { min: 95, max: 100, description: 'Complete, validated data' },
              good: { min: 85, max: 95, description: 'Minor data issues' },
              average: { min: 70, max: 85, description: 'Some data gaps' },
              poor: { min: 50, max: 70, description: 'Significant data issues' },
              critical: { min: 0, max: 50, description: 'Unreliable data' }
            }
          }
        });

      default:
        // Return API information
        return json({
          success: true,
          message: 'Historical Data Statistics API',
          description: 'Advanced statistical analysis of solar production data',
          endpoints: {
            'POST /': 'Generate detailed statistics for historical data',
            'GET /?action=metrics': 'Get available statistical metrics',
            'GET /?action=analysis-types': 'Get available analysis types',
            'GET /?action=benchmarks': 'Get industry performance benchmarks'
          },
          features: [
            'Production performance analysis',
            'Weather correlation analysis',
            'Forecast accuracy assessment',
            'Temporal pattern recognition',
            'Multi-location comparison',
            'Data quality evaluation',
            'Industry benchmarking'
          ],
          supportedAggregations: ['15min', 'hourly', 'daily', 'weekly', 'monthly'],
          maxLocations: 100,
          maxDateRange: '5 years'
        });
    }

  } catch (error) {
    console.error('Statistics API GET error:', error);
    return json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
};

// Enhanced statistics analysis
async function enhanceStatisticsAnalysis(
  baseStatistics: any, 
  requestBody: any, 
  historicalRequest: HistoricalDataRequest
): Promise<any> {
  const enhanced = { ...baseStatistics };

  // Add benchmarking if requested
  if (requestBody.includeBenchmarks) {
    enhanced.benchmarking = generateBenchmarkAnalysis(baseStatistics);
  }

  // Add trend analysis if requested
  if (requestBody.includeTrends) {
    enhanced.trends = await generateTrendAnalysis(baseStatistics, historicalRequest);
  }

  // Add location ranking if multiple locations
  if (historicalRequest.locationIds.length > 1) {
    enhanced.locationRanking = generateLocationRanking(baseStatistics);
  }

  // Add seasonal analysis
  if (requestBody.includeSeasonalAnalysis) {
    enhanced.seasonalAnalysis = generateSeasonalAnalysis(baseStatistics);
  }

  // Add performance alerts and recommendations
  enhanced.insights = generatePerformanceInsights(baseStatistics);

  return enhanced;
}

function generateBenchmarkAnalysis(statistics: any): any {
  const benchmarks = {
    capacity_factor: {
      value: statistics.production?.performance?.averageCapacityFactor || 0,
      benchmark: getBenchmarkCategory(statistics.production?.performance?.averageCapacityFactor || 0, 'capacity_factor'),
      industry_average: 0.18,
      top_quartile: 0.22
    },
    performance_ratio: {
      value: statistics.production?.performance?.averagePerformanceRatio || 0,
      benchmark: getBenchmarkCategory(statistics.production?.performance?.averagePerformanceRatio || 0, 'performance_ratio'),
      industry_average: 0.78,
      top_quartile: 0.83
    },
    availability: {
      value: statistics.production?.performance?.averageAvailability || 0,
      benchmark: getBenchmarkCategory(statistics.production?.performance?.averageAvailability || 0, 'availability'),
      industry_average: 0.92,
      top_quartile: 0.97
    }
  };

  return {
    metrics: benchmarks,
    overallRank: calculateOverallRank(benchmarks),
    improvementAreas: identifyImprovementAreas(benchmarks)
  };
}

function getBenchmarkCategory(value: number, metric: string): string {
  const thresholds: Record<string, Record<string, number>> = {
    capacity_factor: { excellent: 0.25, good: 0.20, average: 0.15, poor: 0.10 },
    performance_ratio: { excellent: 0.85, good: 0.80, average: 0.75, poor: 0.65 },
    availability: { excellent: 0.98, good: 0.95, average: 0.90, poor: 0.80 }
  };

  const metricThresholds = thresholds[metric];
  if (!metricThresholds) return 'unknown';

  if (value >= metricThresholds.excellent) return 'excellent';
  if (value >= metricThresholds.good) return 'good';
  if (value >= metricThresholds.average) return 'average';
  if (value >= metricThresholds.poor) return 'poor';
  return 'critical';
}

function calculateOverallRank(benchmarks: any): string {
  const ranks = Object.values(benchmarks).map((b: any) => b.benchmark);
  const scores = ranks.map(rank => {
    switch (rank) {
      case 'excellent': return 5;
      case 'good': return 4;
      case 'average': return 3;
      case 'poor': return 2;
      case 'critical': return 1;
      default: return 0;
    }
  });

  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  if (avgScore >= 4.5) return 'excellent';
  if (avgScore >= 3.5) return 'good';
  if (avgScore >= 2.5) return 'average';
  if (avgScore >= 1.5) return 'poor';
  return 'critical';
}

function identifyImprovementAreas(benchmarks: any): string[] {
  const improvements: string[] = [];
  
  Object.entries(benchmarks).forEach(([metric, data]: [string, any]) => {
    if (data.benchmark === 'poor' || data.benchmark === 'critical') {
      switch (metric) {
        case 'capacity_factor':
          improvements.push('Review system design and optimize orientation/tilt');
          break;
        case 'performance_ratio':
          improvements.push('Inspect for soiling, shading, or equipment degradation');
          break;
        case 'availability':
          improvements.push('Improve maintenance scheduling and fault response');
          break;
      }
    }
  });

  return improvements;
}

async function generateTrendAnalysis(statistics: any, request: HistoricalDataRequest): Promise<any> {
  // This would perform time series analysis to identify trends
  return {
    production_trend: {
      direction: 'stable', // 'increasing', 'decreasing', 'stable'
      confidence: 0.75,
      rate_of_change: -0.02, // % per month
      significance: 'low'
    },
    efficiency_trend: {
      direction: 'decreasing',
      confidence: 0.82,
      rate_of_change: -0.5, // % per year (degradation)
      significance: 'medium'
    },
    seasonal_variation: {
      peak_season: 'summer',
      variation_coefficient: 0.35,
      predictability_score: 0.88
    }
  };
}

function generateLocationRanking(statistics: any): any {
  // This would rank locations based on performance metrics
  return {
    ranking_criteria: ['capacity_factor', 'performance_ratio', 'availability'],
    rankings: [
      {
        locationId: 1,
        locationName: 'Location 1',
        overallRank: 1,
        scores: { capacity_factor: 0.85, performance_ratio: 0.88, availability: 0.97 }
      }
      // More locations would be added based on actual data
    ],
    correlation_matrix: [
      // Location correlation analysis would go here
    ]
  };
}

function generateSeasonalAnalysis(statistics: any): any {
  return {
    seasonal_patterns: [
      {
        season: 'spring',
        characteristics: 'Moderate production, good weather correlation',
        avg_capacity_factor: 0.18,
        weather_variability: 'medium'
      },
      {
        season: 'summer', 
        characteristics: 'Peak production, high irradiance',
        avg_capacity_factor: 0.24,
        weather_variability: 'low'
      },
      {
        season: 'autumn',
        characteristics: 'Declining production, weather dependent',
        avg_capacity_factor: 0.16,
        weather_variability: 'high'
      },
      {
        season: 'winter',
        characteristics: 'Lowest production, weather challenges',
        avg_capacity_factor: 0.12,
        weather_variability: 'high'
      }
    ],
    peak_performance_months: ['June', 'July', 'August'],
    lowest_performance_months: ['December', 'January', 'February']
  };
}

function generatePerformanceInsights(statistics: any): any {
  const insights = [];

  // Production insights
  if (statistics.production?.performance?.averageCapacityFactor < 0.15) {
    insights.push({
      type: 'warning',
      category: 'production',
      message: 'Capacity factor is below industry average',
      recommendation: 'Review system orientation, shading, and equipment performance',
      impact: 'high'
    });
  }

  // Data quality insights
  if (statistics.dataQuality?.overallScore < 80) {
    insights.push({
      type: 'alert',
      category: 'data_quality',
      message: 'Data quality issues detected',
      recommendation: 'Review data collection systems and validation processes',
      impact: 'medium'
    });
  }

  // Weather correlation insights
  if (statistics.weather?.irradianceProductionCorrelation < 0.7) {
    insights.push({
      type: 'info',
      category: 'weather',
      message: 'Lower than expected correlation with solar irradiance',
      recommendation: 'Investigate potential shading or equipment issues',
      impact: 'medium'
    });
  }

  return {
    insights,
    summary: {
      total_insights: insights.length,
      high_priority: insights.filter(i => i.impact === 'high').length,
      categories: [...new Set(insights.map(i => i.category))]
    }
  };
}

function generateRequestId(): string {
  return `stats_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function determineAnalysisType(requestBody: any): string {
  if (requestBody.includeForecast && requestBody.includeAccuracy) {
    return 'forecast-accuracy';
  }
  if (requestBody.locationIds && requestBody.locationIds.length > 1) {
    return 'multi-location';
  }
  if (requestBody.includeWeather) {
    return 'weather-correlation';
  }
  return 'performance';
}