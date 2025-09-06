import type { CreateLocationRequest } from '$lib/features/locations/models/requests/CreateLocationRequest';
import type { GeoPoint } from '$lib/features/common/models/dto/GeoPoint';

export class CoordinatesValidator {
    /**
     * Validates the create location request
     * @throws Error if validation fails
     */
    static validateCreateLocationRequest(request: CreateLocationRequest): void {
        // Validate name
        if (!request.name?.trim()) {
            throw new Error('Location name is required');
        }
        
        // Validate coordinates exist
        if (!request.coordinates) {
            throw new Error('Location coordinates are required');
        }
        
        // Validate coordinates are valid
        this.validateGeoPoint(request.coordinates);
    }
    
    /**
     * Validates geographic coordinates
     * @throws Error if coordinates are invalid
     */
    static validateGeoPoint(coordinates: GeoPoint): void {
        // Validate latitude
        if (typeof coordinates.latitude !== 'number') {
            throw new Error('Latitude must be a number');
        }
        
        if (coordinates.latitude < -90 || coordinates.latitude > 90) {
            throw new Error('Latitude must be between -90 and 90');
        }
        
        // Validate longitude
        if (typeof coordinates.longitude !== 'number') {
            throw new Error('Longitude must be a number');
        }
        
        if (coordinates.longitude < -180 || coordinates.longitude > 180) {
            throw new Error('Longitude must be between -180 and 180');
        }
    }
    
    /**
     * Checks if coordinates are within valid ranges (doesn't throw)
     * @returns true if valid, false otherwise
     */
    static isValidGeoPoint(coordinates: GeoPoint): boolean {
        try {
            this.validateGeoPoint(coordinates);
            return true;
        } catch {
            return false;
        }
    }
}