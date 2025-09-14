// Simple interface for dashboard weather display
export interface DashboardWeatherData {
    temperature: number;           // Temperature in Celsius
    solarIrradiance: number;      // Global Horizontal Irradiance (GHI) in W/m²
    windSpeed: number;            // Wind speed in m/s
    weatherDescription: string;    // Weather condition description
    timestamp: Date;              // Timestamp of the weather data
}

// Location coordinates for weather API calls
export interface LocationCoordinates {
    id: string;
    latitude: number;
    longitude: number;
}

// Open-Meteo API response format
export interface OpenMeteoResponse {
    current: {
        time: string;
        temperature_2m: number;
        weathercode: number;
        windspeed_10m: number;
        direct_radiation?: number;
        diffuse_radiation?: number;
        direct_normal_irradiance?: number;
    };
}