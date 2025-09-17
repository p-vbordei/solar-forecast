import type { CreateLocationRequest } from "$lib/features/locations/models/requests/CreateLocationRequest";
import { LocationsRepository } from "$lib/features/locations/repositories/LocationsRepository";
import {
  LocationNotFoundError,
  LocationExistsError,
} from "$lib/utils/ApiErrors";
import { LocationStatus } from "@prisma/client";

export class LocationsService {
  private repository = new LocationsRepository();

  /**
   * Get all locations with filtering and pagination
   */
  async getAllLocations(filters: {
    search?: string | null;
    status?: string | null;
    limit: number;
    offset: number;
  }) {
    // Build where clause dynamically (business logic)
    const whereConditions = this.buildWhereClause(filters);

    // Define what fields to select (business logic)
    const selectFields = this.getLocationListFields();

    // Define ordering (business logic)
    const orderBy = { createdAt: "desc" as const };

    // Get locations from repository with business logic applied
    const result = await this.repository.findAll(
      whereConditions,
      filters.offset,
      filters.limit,
      orderBy,
      selectFields,
    );

    return {
      locations: result.locations,
      total: result.total,
      pagination: {
        total: result.total,
        size: filters.limit,
        current: Math.floor(filters.offset / filters.limit) + 1,
      },
      filters: {
        search: filters.search,
        status: filters.status,
      },
    };
  }

  /**
   * Build Prisma where clause based on filters (business logic)
   */
  private buildWhereClause(filters: {
    search?: string | null;
    status?: string | null;
  }) {
    const whereConditions: any = {};

    // Search filter - search in name, city, region, or address
    if (filters.search) {
      whereConditions.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { city: { contains: filters.search, mode: "insensitive" } },
        { region: { contains: filters.search, mode: "insensitive" } },
        { address: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Status filter
    if (filters.status) {
      // Convert string status to enum (business logic)
      const statusEnum = this.convertStatusToEnum(filters.status);
      whereConditions.status = statusEnum;
    }

    return whereConditions;
  }

  /**
   * Convert string status to LocationStatus enum (business logic)
   */
  private convertStatusToEnum(status: string): LocationStatus {
    const statusUpper = status.toUpperCase();

    // Validate status enum
    if (
      !Object.values(LocationStatus).includes(statusUpper as LocationStatus)
    ) {
      throw new Error(
        `Invalid status: ${status}. Valid values are: ${Object.values(LocationStatus).join(", ")}`,
      );
    }

    return statusUpper as LocationStatus;
  }

  /**
   * Define fields to select for location list (business logic)
   */
  private getLocationListFields() {
    return {
      id: true,
      name: true,
      code: true,
      latitude: true,
      longitude: true,
      city: true,
      region: true,
      country: true,
      capacityMW: true,
      timezone: true,
      status: true,
      installationDate: true,
      createdAt: true,
      updatedAt: true,
      // Include client info
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    };
  }

  /**
   * Get location by GUID
   */
  async getLocationById(locationId: string) {
    // Validate GUID format (business logic)
    this.validateGuidFormat(locationId);

    // Define what to include (business logic)
    const includeFields = this.getLocationDetailInclude();

    // Get location from repository
    const location = await this.repository.findById(locationId, includeFields);

    if (!location) {
      throw new LocationNotFoundError(locationId);
    }

    return location;
  }

  /**
   * Validate GUID format (business logic)
   */
  private validateGuidFormat(guid: string): void {
    const guidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!guidRegex.test(guid)) {
      throw new Error(`Invalid GUID format: ${guid}`);
    }
  }

  /**
   * Define fields to include for location detail view (business logic)
   */
  private getLocationDetailInclude() {
    return {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    };
  }

  /**
   * Find location by name (business logic)
   */
  private async findLocationByName(name: string) {
    // Build where clause for name search (business logic)
    const whereClause = {
      name: { equals: name, mode: "insensitive" as const },
    };

    // Define what fields to select (business logic)
    const selectFields = {
      id: true,
      name: true,
      status: true,
    };

    // Get location from repository
    const location = await this.repository.findByName(
      whereClause,
      selectFields,
    );

    return location;
  }

  /**
   * Transform CreateLocationRequest to Prisma schema format (business logic)
   */
  private async transformToPrismaCreateData(
    locationData: CreateLocationRequest,
  ) {
    // Get default client ID - in production this should come from authenticated user context
    const defaultClient = await this.repository.getDefaultClient();
    if (!defaultClient) {
      throw new Error(
        "No default client found. Please run database seed first.",
      );
    }

    return {
      // Required fields
      clientId: defaultClient.id,
      name: locationData.name,
      code: this.generateLocationCode(locationData.name),
      latitude: locationData.coordinates.latitude,
      longitude: locationData.coordinates.longitude,

      // Capacity from basic config
      capacityMW: locationData.basic?.capacityMW || 1.0,

      // Status (convert to enum if provided)
      // status: locationData.basic?.status ?
      //     this.convertStatusToEnum(locationData.basic.status) : 'ACTIVE',

      // Timezone from basic config
      timezone: locationData.basic?.timezone || "UTC",
      city: null,
      region: null,
      country: null,
      address: null,
      altitude: null,

      // Technical specs from panel config
      // panelCount: locationData.panel?.panel_count || null,
      // panelType: locationData.panel?.panel_type || null,
      // tiltAngle: locationData.panel?.tilt_angle || null,
      // azimuthAngle: locationData.panel?.azimuth || null,

      // Inverter specs
      // inverterCount: locationData.inverter?.inverter_count || null,
      // inverterType: locationData.inverter?.inverter_type || null,

      // Performance specs
      // temperatureCoeff: locationData.performance?.temperature_coefficient || null,

      // Additional fields
      trackingSystem: "FIXED",
      isBifacial: false,
      nominalEfficiency: null,
      bifacialityFactor: null,
      dcOverpowerRatio: null,
      performanceRatio: null,

      // Dates
      installationDate: null,
      commissioningDate: null,
      warrantyEndDate: null,
      lastMaintenance: null,
      nextMaintenance: null,

      // Performance benchmarks
      expectedYield: null,
      degradationRate: null,

      // JSON fields for additional config
      locationData: null,
      plantData: locationData,
      performanceData: locationData.performance || null,
      outputConfig: null,
      calibrationSettings: null,
      monitoringConfig: null,
      clientConfig: null,

      // Metadata
      notes: null,
      tags: null,
      certificationData: null,
      lastMaintenanceDate: null,
      version: 1,
      lastCalibrationDate: null,
      calibrationStatus: "PENDING",
      bulkOperationId: null,
      displayCapacity: null,
      displayLocation: null,
      statusDisplay: null,
      metadata: null,
    };
  }

  /**
   * Generate location code from name (business logic)
   */
  private generateLocationCode(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .substring(0, 20) +
      "_" +
      Date.now().toString().slice(-6)
    );
  }

  /**
   * Create new location
   */
  async createLocation(locationData: CreateLocationRequest) {
    // Note: No name uniqueness check - multiple locations can have the same name

    // Transform request data to match Prisma schema (business logic)
    const prismaData = await this.transformToPrismaCreateData(locationData);

    // Save to database through repository
    const createdLocation = await this.repository.create(prismaData);

    return createdLocation;
  }

  /**
   * Update existing location
   */
  async updateLocation(
    locationId: string,
    updateData: Partial<CreateLocationRequest>,
  ) {
    // Check if location exists (throws LocationNotFoundError if not found)
    await this.getLocationById(locationId);

    // Update location through repository
    const updatedLocation = await this.repository.update(locationId, {
      ...updateData,
      updated_at: new Date().toISOString(),
    });

    return updatedLocation;
  }

  /**
   * Soft delete location
   */
  async deleteLocation(locationId: string) {
    // Check if location exists (throws LocationNotFoundError if not found)
    await this.getLocationById(locationId);

    // Perform soft delete through repository
    const result = await this.repository.softDelete(locationId);

    return result;
  }

  /**
   * Get total number of active locations
   */
  async getTotalNumberOfLocations(): Promise<number> {
    // Build where clause for active locations only (business logic)
    const whereConditions = {
      status: LocationStatus.ACTIVE,
    };

    // Get count from repository
    const count = await this.repository.count(whereConditions);

    return count;
  }
}
