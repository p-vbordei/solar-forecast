import type { CreateLocationRequest } from '$lib/features/locations/models/requests/CreateLocationRequest';
import type { GeoPoint } from '$lib/features/common/models/dto/GeoPoint';
import { LocationValidationError, CoordinatesValidationError } from '$lib/utils/ApiErrors';

export class CoordinatesValidator {
    /**
     * Validates the create location request
     * @throws LocationValidationError if validation fails
     */
    static validateCreateLocationRequest(request: CreateLocationRequest): void {
        // Validate name
        if (!request.name?.trim()) {
            throw new LocationValidationError('Location name is required', 'name');
        }
        
        // Validate coordinates exist
        if (!request.coordinates) {
            throw new LocationValidationError('Location coordinates are required', 'coordinates');
        }
        
        // Validate coordinates are valid
        this.validateGeoPoint(request.coordinates);
    }
    
    /**
     * Validates geographic coordinates
     * @throws CoordinatesValidationError if coordinates are invalid
     */
    static validateGeoPoint(coordinates: GeoPoint): void {
        // Validate latitude
        if (typeof coordinates.latitude !== 'number') {
            throw new CoordinatesValidationError('Latitude must be a number');
        }
        
        if (coordinates.latitude < -90 || coordinates.latitude > 90) {
            throw new CoordinatesValidationError('Latitude must be between -90 and 90');
        }
        
        // Validate longitude
        if (typeof coordinates.longitude !== 'number') {
            throw new CoordinatesValidationError('Longitude must be a number');
        }
        
        if (coordinates.longitude < -180 || coordinates.longitude > 180) {
            throw new CoordinatesValidationError('Longitude must be between -180 and 180');
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