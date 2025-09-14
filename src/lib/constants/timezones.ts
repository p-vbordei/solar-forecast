/**
 * UTC-based timezone definitions for the Solar Forecast Platform
 * Matches the Weather Forecast timezone naming convention
 */

export interface Timezone {
	value: string;
	label: string;
	offset: number; // Hours from UTC
	description?: string;
}

export const TIMEZONES: readonly Timezone[] = [
	{ value: 'UTC-3', label: 'UTC-3', offset: -3 },
	{ value: 'UTC-2', label: 'UTC-2', offset: -2 },
	{ value: 'UTC-1', label: 'UTC-1', offset: -1 },
	{ value: 'UTC', label: 'UTC', offset: 0 },
	{ value: 'UTC+1', label: 'UTC+1 (CET)', offset: 1, description: 'Central European Time' },
	{ value: 'UTC+2', label: 'UTC+2 (EET/Bucharest)', offset: 2, description: 'Eastern European Time' },
	{ value: 'UTC+3', label: 'UTC+3 (MSK)', offset: 3, description: 'Moscow Time' },
	{ value: 'UTC+4', label: 'UTC+4', offset: 4 }
] as const;

export type TimezoneValue = typeof TIMEZONES[number]['value'];

/**
 * Get timezone by value
 */
export function getTimezone(value: string): Timezone | undefined {
	return TIMEZONES.find(tz => tz.value === value);
}

/**
 * Get timezone label for display
 */
export function getTimezoneLabel(value: string): string {
	const timezone = getTimezone(value);
	return timezone?.label || value;
}

/**
 * Get default timezone (UTC+2 for Bucharest)
 */
export function getDefaultTimezone(): Timezone {
	return TIMEZONES[5]; // UTC+2 (EET/Bucharest)
}

/**
 * Detect timezone based on latitude/longitude
 * This is a simplified approximation - in production, use a proper timezone library
 */
export function detectTimezoneFromCoordinates(latitude: number, longitude: number): string {
	// Approximate timezone based on longitude
	// Each 15 degrees of longitude represents roughly 1 hour
	const hours = Math.round(longitude / 15);

	// Clamp to our available range (-3 to +4)
	const clampedHours = Math.max(-3, Math.min(4, hours));

	// Find matching timezone
	const timezone = TIMEZONES.find(tz => tz.offset === clampedHours);
	return timezone?.value || 'UTC+2'; // Default to Bucharest timezone
}