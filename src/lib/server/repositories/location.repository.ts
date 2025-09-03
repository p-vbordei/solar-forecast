import { db } from '../database';
import type { Prisma, Location, LocationStatus } from '@prisma/client';
import type { LocationFilter, LocationCreateInput } from '$lib/types/location';

// Repository - handles data access using Prisma
export class LocationRepository {
	async findAll(filter?: LocationFilter): Promise<Location[]> {
		const where: Prisma.LocationWhereInput = {};
		
		if (filter) {
			if (filter.clientId !== undefined) {
				where.clientId = filter.clientId;
			}
			
			if (filter.status) {
				where.status = filter.status.toUpperCase() as LocationStatus;
			}
			
			if (filter.minCapacity !== undefined || filter.maxCapacity !== undefined) {
				where.capacityMW = {};
				if (filter.minCapacity !== undefined) {
					where.capacityMW.gte = filter.minCapacity;
				}
				if (filter.maxCapacity !== undefined) {
					where.capacityMW.lte = filter.maxCapacity;
				}
			}
		}
		
		return await db.location.findMany({
			where,
			include: {
				client: true,
				_count: {
					select: {
						forecasts: true,
						production: true,
						alerts: {
							where: { status: 'ACTIVE' }
						}
					}
				}
			},
			orderBy: {
				name: 'asc'
			}
		});
	}
	
	async findById(id: number): Promise<Location | null> {
		return await db.location.findUnique({
			where: { id },
			include: {
				client: true,
				forecasts: {
					take: 24,
					orderBy: { time: 'desc' }
				},
				production: {
					take: 24,
					orderBy: { time: 'desc' }
				},
				alerts: {
					where: { status: 'ACTIVE' },
					orderBy: { triggeredAt: 'desc' },
					take: 5
				},
				weatherData: {
					take: 1,
					orderBy: { time: 'desc' }
				}
			}
		});
	}
	
	async findByCoordinates(latitude: number, longitude: number): Promise<Location | null> {
		// Check if location exists within 0.001 degrees (about 100m)
		const locations = await db.location.findMany({
			where: {
				AND: [
					{ latitude: { gte: latitude - 0.001, lte: latitude + 0.001 } },
					{ longitude: { gte: longitude - 0.001, lte: longitude + 0.001 } }
				]
			}
		});
		
		return locations[0] || null;
	}
	
	async create(data: LocationCreateInput): Promise<Location> {
		const prismaData: Prisma.LocationCreateInput = {
			client: {
				connect: { id: data.clientId || 1 }
			},
			name: data.name,
			code: data.code || `LOC-${Date.now()}`,
			latitude: data.latitude,
			longitude: data.longitude,
			timezone: data.timezone || 'UTC',
			capacityMW: data.capacity,
			panelCount: data.panelCount,
			panelType: data.panelType || 'Monocrystalline',
			installationDate: data.installationDate ? new Date(data.installationDate) : new Date(),
			status: 'ACTIVE'
		};
		
		return await db.location.create({
			data: prismaData,
			include: {
				client: true
			}
		});
	}
	
	async update(id: number, data: Partial<LocationCreateInput>): Promise<Location> {
		const updateData: Prisma.LocationUpdateInput = {};
		
		if (data.name !== undefined) updateData.name = data.name;
		if (data.latitude !== undefined) updateData.latitude = data.latitude;
		if (data.longitude !== undefined) updateData.longitude = data.longitude;
		if (data.timezone !== undefined) updateData.timezone = data.timezone;
		if (data.capacity !== undefined) updateData.capacityMW = data.capacity;
		if (data.panelCount !== undefined) updateData.panelCount = data.panelCount;
		if (data.panelType !== undefined) updateData.panelType = data.panelType;
		if (data.installationDate !== undefined) {
			updateData.installationDate = new Date(data.installationDate);
		}
		
		return await db.location.update({
			where: { id },
			data: updateData,
			include: {
				client: true
			}
		});
	}
	
	async delete(id: number): Promise<boolean> {
		try {
			// Soft delete by setting status to DECOMMISSIONED
			await db.location.update({
				where: { id },
				data: { status: 'DECOMMISSIONED' }
			});
			return true;
		} catch (error) {
			return false;
		}
	}
	
	// Additional repository methods
	async countByClient(clientId: number): Promise<number> {
		return await db.location.count({
			where: { clientId }
		});
	}
	
	async getTotalCapacity(filter?: LocationFilter): Promise<number> {
		const where: Prisma.LocationWhereInput = {};
		
		if (filter?.clientId !== undefined) {
			where.clientId = filter.clientId;
		}
		
		if (filter?.status) {
			where.status = filter.status.toUpperCase() as LocationStatus;
		}
		
		const result = await db.location.aggregate({
			where,
			_sum: {
				capacityMW: true
			}
		});
		
		return result._sum.capacityMW || 0;
	}
	
	async getLocationsByStatus(): Promise<Record<string, number>> {
		const statuses = await db.location.groupBy({
			by: ['status'],
			_count: {
				status: true
			}
		});
		
		const statusCount: Record<string, number> = {
			ACTIVE: 0,
			MAINTENANCE: 0,
			OFFLINE: 0,
			DECOMMISSIONED: 0
		};
		
		statuses.forEach(s => {
			statusCount[s.status] = s._count.status;
		});
		
		return statusCount;
	}
	
	// Production and forecast statistics
	async getLocationStatistics(locationId: number, startDate?: Date, endDate?: Date) {
		const where: any = { locationId };
		
		if (startDate || endDate) {
			where.time = {};
			if (startDate) where.time.gte = startDate;
			if (endDate) where.time.lte = endDate;
		}
		
		const [production, forecasts, alerts] = await Promise.all([
			db.production.aggregate({
				where,
				_avg: {
					powerOutputMW: true,
					efficiency: true
				},
				_sum: {
					energyMWh: true
				},
				_count: true
			}),
			db.forecast.aggregate({
				where,
				_avg: {
					powerOutputMW: true,
					confidence: true
				},
				_count: true
			}),
			db.alert.count({
				where: {
					locationId,
					status: 'ACTIVE'
				}
			})
		]);
		
		return {
			production,
			forecasts,
			activeAlerts: alerts
		};
	}
}