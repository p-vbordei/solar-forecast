/**
 * Default configuration for Romanian solar plants
 * Based on typical utility-scale installations in Romania
 */

export interface SolarPlantDefaults {
  panels: {
    tilt: number;
    azimuth: number;
    technology: string;
    temperatureCoefficient: number;
    nominalEfficiency: number;
    bifacial: boolean;
    bifacialityFactor: number;
  };
  inverter: {
    efficiency: number;
    powerFactor: number;
    efficiencyCurve?: Record<number, number>;
  };
  mounting: {
    type: string;
    groundCoverageRatio: number;
    rowSpacing: number;
  };
  losses: {
    soilingMonthly: number[];
    shading: number;
    snow: number;
    mismatch: number;
    wiringDc: number;
    wiringAc: number;
    transformer: number;
    availability: number;
  };
  performance: {
    clearSky: number;
    partlyCloudy: number;
    cloudy: number;
    overcast: number;
    dawnDuskFactor: number;
    temperatureModel: string;
    performanceRatio: number;
  };
  physics: {
    albedo: number;
    dcOverpowerRatio: number;
  };
}

/**
 * Romanian solar plant defaults
 * Optimized for 44-47° latitude range
 */
export const ROMANIAN_SOLAR_DEFAULTS: SolarPlantDefaults = {
  panels: {
    // Optimal tilt for Romania (latitude 44-47°)
    // Rule of thumb: latitude - 10° for year-round production
    tilt: 35,

    // South-facing (180°) for Northern hemisphere
    azimuth: 180,

    // Modern panels are typically monocrystalline
    technology: 'monocrystalline',

    // Standard temperature coefficient for mono-Si
    temperatureCoefficient: -0.0035, // -0.35%/°C

    // Modern panel efficiency (20-22% for premium panels)
    nominalEfficiency: 0.21,

    // Most Romanian installations use standard panels
    bifacial: false,
    bifacialityFactor: 0.0
  },

  inverter: {
    // Modern inverter efficiency
    efficiency: 0.98,

    // Unity power factor for grid-tied systems
    powerFactor: 1.0,

    // Efficiency curve for different load levels
    efficiencyCurve: {
      10: 0.95,   // 10% load
      25: 0.97,   // 25% load
      50: 0.98,   // 50% load
      75: 0.98,   // 75% load
      100: 0.975  // 100% load
    }
  },

  mounting: {
    // Fixed-tilt is standard in Romania
    type: 'fixed',

    // Ground coverage for utility scale
    groundCoverageRatio: 0.4,

    // Row spacing to minimize shading (meters)
    rowSpacing: 8
  },

  losses: {
    // Monthly soiling losses for Romanian climate (Jan-Dec)
    // Higher in winter/autumn due to rain/snow
    soilingMonthly: [
      0.05, // Jan - snow/rain
      0.04, // Feb - snow/rain
      0.03, // Mar - rain
      0.02, // Apr - rain decreases
      0.02, // May - dry
      0.02, // Jun - dry
      0.02, // Jul - dry
      0.02, // Aug - dry
      0.03, // Sep - rain starts
      0.04, // Oct - rain
      0.05, // Nov - rain/snow
      0.05  // Dec - snow/rain
    ],

    // System losses (%)
    shading: 0.01,        // 1% - minimal for well-designed plants
    snow: 0.015,          // 1.5% - winter snow coverage
    mismatch: 0.02,       // 2% - module mismatch
    wiringDc: 0.015,      // 1.5% - DC wiring losses
    wiringAc: 0.01,       // 1% - AC wiring losses
    transformer: 0.015,   // 1.5% - transformer losses
    availability: 0.02    // 2% - system downtime/maintenance
  },

  performance: {
    // Weather-dependent performance ratios
    clearSky: 0.95,      // Clear sky conditions
    partlyCloudy: 0.88,  // Partly cloudy
    cloudy: 0.82,        // Cloudy
    overcast: 0.75,      // Overcast/heavy clouds

    // Dawn/dusk performance
    dawnDuskFactor: 0.85,

    // Temperature model for PVLIB
    temperatureModel: 'sapm', // Sandia Array Performance Model

    // Overall system performance ratio
    performanceRatio: 0.84 // Typical for well-maintained plants
  },

  physics: {
    // Ground reflectance (0.2 for grass/soil)
    albedo: 0.2,

    // DC to AC overpower ratio (oversizing DC)
    dcOverpowerRatio: 1.15 // 15% DC oversizing
  }
};

/**
 * Get defaults based on panel technology
 */
export function getTechnologyDefaults(technology: string) {
  const techDefaults: Record<string, Partial<typeof ROMANIAN_SOLAR_DEFAULTS.panels>> = {
    'monocrystalline': {
      temperatureCoefficient: -0.0035,
      nominalEfficiency: 0.21
    },
    'polycrystalline': {
      temperatureCoefficient: -0.004,
      nominalEfficiency: 0.18
    },
    'thin-film': {
      temperatureCoefficient: -0.002,
      nominalEfficiency: 0.14
    },
    'bifacial': {
      temperatureCoefficient: -0.0035,
      nominalEfficiency: 0.22,
      bifacial: true,
      bifacialityFactor: 0.7
    }
  };

  return techDefaults[technology.toLowerCase()] || techDefaults['monocrystalline'];
}

/**
 * Calculate optimal tilt angle based on latitude
 */
export function calculateOptimalTilt(latitude: number, optimization: 'year' | 'summer' | 'winter' = 'year'): number {
  switch (optimization) {
    case 'summer':
      return Math.round(latitude - 15);
    case 'winter':
      return Math.round(latitude + 15);
    case 'year':
    default:
      // For Romania (44-47° latitude), optimal year-round tilt is latitude - 10°
      return Math.round(latitude - 10);
  }
}

/**
 * Get tracking system configuration
 */
export function getTrackingDefaults(trackingType: string) {
  const trackingDefaults = {
    'FIXED': {
      type: 'fixed',
      tilt: 35,
      azimuth: 180
    },
    'SINGLE_AXIS': {
      type: 'single_axis',
      axisAzimuth: 180, // North-South axis
      maxAngle: 45,
      backtracking: true
    },
    'DUAL_AXIS': {
      type: 'dual_axis',
      maxElevation: 85,
      maxAzimuth: 180
    }
  };

  return trackingDefaults[trackingType] || trackingDefaults['FIXED'];
}

/**
 * Apply defaults to incomplete location data
 */
export function applyLocationDefaults(location: any) {
  const defaults = ROMANIAN_SOLAR_DEFAULTS;

  // Calculate optimal tilt if not provided
  const tilt = location.tiltAngle || calculateOptimalTilt(location.latitude);

  // Apply panel defaults
  const panelData = {
    tilt,
    azimuth: location.azimuthAngle || defaults.panels.azimuth,
    technology: location.panelTechnology || location.panelType || defaults.panels.technology,
    temperatureCoefficient: location.temperatureCoeff || defaults.panels.temperatureCoefficient,
    nominalEfficiency: location.nominalEfficiency || defaults.panels.nominalEfficiency,
    bifacial: location.isBifacial || defaults.panels.bifacial,
    bifacialityFactor: location.bifacialityFactor || defaults.panels.bifacialityFactor
  };

  // Apply inverter defaults
  const inverterData = {
    efficiency: defaults.inverter.efficiency,
    powerFactor: defaults.inverter.powerFactor,
    efficiencyCurve: defaults.inverter.efficiencyCurve
  };

  // Apply performance defaults
  const performanceData = {
    performanceRatio: location.performanceRatio || defaults.performance.performanceRatio,
    albedo: defaults.physics.albedo,
    dcOverpowerRatio: location.dcOverpowerRatio || defaults.physics.dcOverpowerRatio,
    losses: defaults.losses,
    weatherRatios: {
      clearSky: defaults.performance.clearSky,
      partlyCloudy: defaults.performance.partlyCloudy,
      cloudy: defaults.performance.cloudy,
      overcast: defaults.performance.overcast
    }
  };

  return {
    ...location,
    plantData: {
      ...location.plantData,
      panels: panelData,
      inverter: inverterData,
      mounting: defaults.mounting
    },
    performanceData: {
      ...location.performanceData,
      ...performanceData
    }
  };
}
