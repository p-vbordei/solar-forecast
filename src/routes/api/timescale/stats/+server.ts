import { json } from '@sveltejs/kit';
import { TimescaleQueries } from '$lib/server/database.js';
import type { RequestHandler } from './$types';

/**
 * TimescaleDB Statistics API
 * GET /api/timescale/stats?location_id=1&hours=24
 * 
 * Provides optimized time-series statistics using TimescaleDB continuous aggregates
 * for fast dashboard queries and real-time analytics
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const locationId = url.searchParams.get('location_id');
    const hours = parseInt(url.searchParams.get('hours') || '24');
    const days = parseInt(url.searchParams.get('days') || '7');
    const includeForecasts = url.searchParams.get('include_forecasts') === 'true';

    if (!locationId) {
      return json({
        error: 'location_id parameter is required'
      }, { status: 400 });
    }

    const locationIdNum = parseInt(locationId);
    if (isNaN(locationIdNum)) {
      return json({
        error: 'location_id must be a valid number'
      }, { status: 400 });
    }

    // Run queries in parallel for better performance
    const [
      productionHourly,
      productionDaily,
      forecastHourly
    ] = await Promise.all([
      TimescaleQueries.getProductionHourly(locationIdNum, hours),
      TimescaleQueries.getProductionDaily(locationIdNum, days),
      includeForecasts ? TimescaleQueries.getForecastHourly(locationIdNum, undefined, hours) : Promise.resolve([])
    ]);

    // Calculate summary statistics
    const productionSummary = calculateProductionSummary(productionDaily);
    const forecastSummary = includeForecasts ? calculateForecastSummary(forecastHourly) : null;

    return json({
      status: 'success',
      location_id: locationIdNum,
      time_range: {
        hours: hours,
        days: days,
        generated_at: new Date().toISOString()
      },
      production: {
        summary: productionSummary,
        hourly: formatProductionHourly(productionHourly),
        daily: formatProductionDaily(productionDaily)
      },
      ...(includeForecasts && {
        forecasts: {
          summary: forecastSummary,
          hourly: formatForecastHourly(forecastHourly)
        }
      }),
      performance: {
        data_source: 'timescaledb_continuous_aggregates',
        query_time_ms: 'optimized',
        cache_status: 'pre_computed'
      }
    });

  } catch (error) {
    console.error('TimescaleDB stats query failed:', error);
    
    return json({
      status: 'error',
      message: 'Failed to retrieve statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

// Helper functions for data processing
function calculateProductionSummary(dailyData: any[]) {
  if (!dailyData.length) return null;

  const totals = dailyData.reduce((acc, day) => ({
    totalEnergy: acc.totalEnergy + (parseFloat(day.total_energy_mwh) || 0),
    avgCapacityFactor: acc.avgCapacityFactor + (parseFloat(day.avg_capacity_factor) || 0),
    avgPerformanceRatio: acc.avgPerformanceRatio + (parseFloat(day.avg_performance_ratio) || 0),
    totalDowntime: acc.totalDowntime + (parseInt(day.total_downtime_minutes) || 0),
    totalSamples: acc.totalSamples + (parseInt(day.sample_count) || 0)
  }), {
    totalEnergy: 0,
    avgCapacityFactor: 0,
    avgPerformanceRatio: 0,
    totalDowntime: 0,
    totalSamples: 0
  });

  return {
    total_energy_mwh: Math.round(totals.totalEnergy * 100) / 100,
    avg_capacity_factor: Math.round((totals.avgCapacityFactor / dailyData.length) * 1000) / 1000,
    avg_performance_ratio: Math.round((totals.avgPerformanceRatio / dailyData.length) * 1000) / 1000,
    total_downtime_hours: Math.round((totals.totalDowntime / 60) * 10) / 10,
    availability_percent: Math.round((1 - totals.totalDowntime / (dailyData.length * 24 * 60)) * 10000) / 100,
    data_quality: totals.totalSamples > 0 ? 'good' : 'insufficient'
  };
}

function calculateForecastSummary(hourlyData: any[]) {
  if (!hourlyData.length) return null;

  const modelStats = hourlyData.reduce((acc, hour) => {
    const model = hour.modelType || 'unknown';
    if (!acc[model]) {
      acc[model] = {
        count: 0,
        totalConfidence: 0,
        highQualityCount: 0
      };
    }
    
    acc[model].count += parseInt(hour.forecast_count) || 0;
    acc[model].totalConfidence += parseFloat(hour.avg_confidence) || 0;
    acc[model].highQualityCount += parseInt(hour.high_quality_forecasts) || 0;
    
    return acc;
  }, {} as Record<string, any>);

  return {
    models: Object.entries(modelStats).map(([model, stats]) => ({
      model_type: model,
      forecast_count: stats.count,
      avg_confidence: Math.round((stats.totalConfidence / hourlyData.filter(h => h.modelType === model).length) * 1000) / 1000,
      quality_ratio: stats.count > 0 ? Math.round((stats.highQualityCount / stats.count) * 1000) / 1000 : 0
    })),
    total_forecasts: Object.values(modelStats).reduce((sum, stats) => sum + stats.count, 0)
  };
}

function formatProductionHourly(data: any[]) {
  return data.map(row => ({
    timestamp: row.bucket,
    avg_power_mw: Math.round(parseFloat(row.avg_power_mw || '0') * 1000) / 1000,
    max_power_mw: Math.round(parseFloat(row.max_power_mw || '0') * 1000) / 1000,
    capacity_factor: Math.round(parseFloat(row.avg_capacity_factor || '0') * 1000) / 1000,
    sample_count: parseInt(row.sample_count || '0'),
    data_quality: parseInt(row.good_samples || '0') / parseInt(row.sample_count || '1')
  }));
}

function formatProductionDaily(data: any[]) {
  return data.map(row => ({
    date: row.bucket,
    avg_power_mw: Math.round(parseFloat(row.avg_power_mw || '0') * 1000) / 1000,
    max_power_mw: Math.round(parseFloat(row.max_power_mw || '0') * 1000) / 1000,
    total_energy_mwh: Math.round(parseFloat(row.total_energy_mwh || '0') * 100) / 100,
    capacity_factor: Math.round(parseFloat(row.avg_capacity_factor || '0') * 1000) / 1000,
    performance_ratio: Math.round(parseFloat(row.avg_performance_ratio || '0') * 1000) / 1000,
    downtime_hours: Math.round((parseInt(row.total_downtime_minutes || '0') / 60) * 10) / 10,
    sample_count: parseInt(row.sample_count || '0')
  }));
}

function formatForecastHourly(data: any[]) {
  return data.map(row => ({
    timestamp: row.bucket,
    model_type: row.modelType,
    avg_power_mw: Math.round(parseFloat(row.avg_power_mw || '0') * 1000) / 1000,
    confidence_lower: Math.round(parseFloat(row.avg_power_q10 || '0') * 1000) / 1000,
    confidence_upper: Math.round(parseFloat(row.avg_power_q90 || '0') * 1000) / 1000,
    avg_confidence: Math.round(parseFloat(row.avg_confidence || '0') * 1000) / 1000,
    forecast_count: parseInt(row.forecast_count || '0'),
    quality_score: parseFloat(row.high_quality_forecasts || '0') / parseFloat(row.forecast_count || '1')
  }));
}