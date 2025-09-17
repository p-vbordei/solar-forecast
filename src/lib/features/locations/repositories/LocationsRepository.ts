import { db } from "$lib/server/database";

/**
 * Repository layer for location data access
 * Handles all database operations for locations
 */
export class LocationsRepository {
  /**
   * Get default client for location creation
   */
  async getDefaultClient() {
    const client = await db.client.findFirst({
      where: {
        name: "Default Solar Operations",
      },
      select: {
        id: true,
        name: true,
      },
    });

    return client;
  }

  /**
   * Find all locations with Prisma where clause
   */
  async findAll(
    whereConditions: any,
    skip: number,
    take: number,
    orderBy: any,
    select: any,
  ) {
    // Add deletedAt filter to where conditions (industry standard soft delete)
    const whereWithDeleted = {
      ...whereConditions,
      deletedAt: null,
    };

    // Execute queries in parallel for better performance
    const [locations, total] = await Promise.all([
      // Get locations with pagination
      db.location.findMany({
        where: whereWithDeleted,
        skip,
        take,
        orderBy,
        select,
      }),

      // Get total count for pagination
      db.location.count({
        where: whereWithDeleted,
      }),
    ]);

    return {
      locations,
      total,
    };
  }

  /**
   * Find location by ID
   */
  async findById(id: string, include?: any) {
    const location = await db.location.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include,
    });

    return location;
  }

  /**
   * Find location by name
   */
  async findByName(whereClause: any, select?: any) {
    const location = await db.location.findFirst({
      where: {
        ...whereClause,
        deletedAt: null,
      },
      select,
    });

    return location;
  }

  /**
   * Create new location
   */
  async create(data: any) {
    const location = await db.location.create({
      data,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return location;
  }

  /**
   * Update existing location
   */
  async update(
    locationId: string,
    updateData: Partial<{
      name: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
      basic: any;
      panel: any;
      inverter: any;
      performance: any;
      updated_at: string;
    }>,
  ) {
    // Build update data object based on what's provided
    const prismaUpdateData: any = {
      updatedAt: new Date(),
    };

    // Handle name update
    if (updateData.name) {
      prismaUpdateData.name = updateData.name;
    }

    // Handle coordinates update
    if (updateData.coordinates) {
      prismaUpdateData.latitude = updateData.coordinates.latitude;
      prismaUpdateData.longitude = updateData.coordinates.longitude;
    }

    // Handle basic config updates
    if (updateData.basic) {
      if (updateData.basic.capacityMW) {
        prismaUpdateData.capacityMW = updateData.basic.capacityMW;
      }
      if (updateData.basic.status) {
        prismaUpdateData.status = updateData.basic.status;
      }
    }

    // Update location in database
    const location = await db.location.update({
      where: { id: locationId },
      data: prismaUpdateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return location;
  }

  /**
   * Soft delete location
   */
  async softDelete(locationId: string) {
    // Industry standard soft delete using deletedAt timestamp
    const location = await db.location.update({
      where: {
        id: locationId,
        deletedAt: null, // Only delete if not already deleted
      },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return location;
  }

  /**
   * Count locations with given conditions
   */
  async count(whereConditions: any): Promise<number> {
    // Add deletedAt filter to where conditions (industry standard soft delete)
    const whereWithDeleted = {
      ...whereConditions,
      deletedAt: null,
    };

    const count = await db.location.count({
      where: whereWithDeleted,
    });

    return count;
  }
}
