import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const location = url.searchParams.get('location');
    const interval = url.searchParams.get('interval') || 'hourly';
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');

    if (!location || !start || !end) {
      return json(
        { success: false, error: 'Missing required parameters: location, start, end' },
        { status: 400 }
      );
    }

    // Mock historical data - replace with actual database query
    const historicalData = generateMockHistoricalData(start, end, interval);

    return json({
      success: true,
      data: historicalData,
      metadata: {
        location,
        interval,
        start,
        end,
        dataPoints: historicalData.length,
        dataType: 'historical_production'
      }
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return json(
      { success: false, error: 'Failed to fetch historical data' },
      { status: 500 }
    );
  }
};

function generateMockHistoricalData(start: string, end: string, interval: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const data = [];
  
  let currentDate = new Date(startDate);
  let intervalMs: number;
  
  switch (interval) {
    case '15min':
      intervalMs = 15 * 60 * 1000;
      break;
    case 'hourly':
      intervalMs = 60 * 60 * 1000;
      break;
    case 'daily':
      intervalMs = 24 * 60 * 60 * 1000;
      break;
    case 'weekly':
      intervalMs = 7 * 24 * 60 * 60 * 1000;
      break;
    default:
      intervalMs = 60 * 60 * 1000;
  }
  
  // Base capacity for the location (MW)
  const baseCapacity = 50;
  
  while (currentDate <= endDate) {
    const hour = currentDate.getHours();
    const dayOfYear = Math.floor((currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    let production = 0;
    let efficiency = 0;
    let availability = 0.95 + Math.random() * 0.05; // 95-100% availability
    
    // Simulate historical production patterns
    if (hour >= 6 && hour <= 18) {
      const solarFactor = Math.sin((hour - 6) / 12 * Math.PI);
      const seasonalFactor = 0.7 + 0.3 * Math.sin((dayOfYear - 80) / 365 * 2 * Math.PI); // Peak in summer
      const weatherVariability = 0.7 + Math.random() * 0.6; // Weather impact
      const degradationFactor = 0.98; // Slight degradation over time
      
      production = baseCapacity * solarFactor * seasonalFactor * weatherVariability * degradationFactor * availability;
      efficiency = (production / baseCapacity) * 100;
    }
    
    // Add some realistic variations and occasional maintenance periods
    if (Math.random() < 0.01) { // 1% chance of maintenance
      production *= 0.1;
      availability *= 0.5;
      efficiency *= 0.1;
    }
    
    data.push({
      timestamp: currentDate.toISOString(),
      production: Math.max(0, Math.round(production * 100) / 100),
      efficiency: Math.max(0, Math.round(efficiency * 100) / 100),
      availability: Math.round(availability * 1000) / 1000,
      capacity_factor: Math.round((production / baseCapacity) * 10000) / 100,
      performance_ratio: Math.round((efficiency / 85) * 1000) / 1000, // Assuming 85% expected efficiency
      energy_yield: interval === 'daily' ? production * 24 : interval === 'hourly' ? production : production / 4,
      irradiance_actual: 200 + Math.random() * 800, // Historical irradiance
      temperature_avg: 15 + Math.sin(dayOfYear / 365 * 2 * Math.PI) * 20 + (Math.random() - 0.5) * 10,
      wind_speed_avg: 5 + Math.random() * 10,
      data_quality: Math.random() > 0.05 ? 'good' : 'fair', // 95% good quality
      maintenance_flag: Math.random() < 0.005, // 0.5% maintenance events
      anomaly_detected: Math.random() < 0.02 // 2% anomaly detection
    });
    
    currentDate = new Date(currentDate.getTime() + intervalMs);
  }
  
  return data;
}