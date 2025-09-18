/**
 * Storage manager utility for handling localStorage preferences
 */

const STORAGE_KEYS = {
  SELECTED_LOCATION: 'selectedLocation',
  SELECTED_DASHBOARD_LOCATION: 'selectedDashboardLocation',
  SELECTED_WEATHER_LOCATION: 'selectedWeatherLocation',
  FORECAST_PREFERENCES: 'forecastPreferences'
} as const;

export class StorageManager {
  /**
   * Clear all stored location preferences
   */
  static clearLocationPreferences(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('Cleared all location preferences from localStorage');
    }
  }

  /**
   * Get stored location preference with validation
   */
  static getStoredLocation(key: keyof typeof STORAGE_KEYS, validLocationIds: string[]): string | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const storedValue = localStorage.getItem(STORAGE_KEYS[key]);

    // Validate that stored location ID exists in the valid list
    if (storedValue && validLocationIds.includes(storedValue)) {
      return storedValue;
    }

    // Clear invalid stored value
    if (storedValue) {
      console.warn(`Invalid stored location ID: ${storedValue}. Clearing...`);
      localStorage.removeItem(STORAGE_KEYS[key]);
    }

    return null;
  }

  /**
   * Set location preference
   */
  static setStoredLocation(key: keyof typeof STORAGE_KEYS, locationId: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEYS[key], locationId);
    }
  }

  /**
   * Clear all application storage (full reset)
   */
  static clearAllStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear();
      console.log('Cleared all localStorage data');
    }
  }
}