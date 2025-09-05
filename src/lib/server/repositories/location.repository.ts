import { db } from '../database';
import type { Prisma } from '@prisma/client';
import type { Location, LocationFilter, LocationCreateInput, LocationSummary, LocationTechnicalDetails } from '$lib/types/location';
import { LOCATION_DEFAULTS, getOptimalTilt, detectTimezone } from '$lib/types/location';

// Repository - handles data access using Prisma
export class LocationRepository {
	// Convert Prisma Location to our Location interface
	private mapPrismaToLocation(prismaLocation: any): Location {
		// Parse JSON fields from database
		const locationData = typeof prismaLocation.locationData === 'string' 
			? JSON.parse(prismaLocation.locationData) 
			: (prismaLocation.locationData || {});
		
		const plantData = typeof prismaLocation.plantData === 'string'
			? JSON.parse(prismaLocation.plantData)
			: (prismaLocation.plantData || {});
		
		const performanceData = typeof prismaLocation.performanceData === 'string'
			? JSON.parse(prismaLocation.performanceData)
			: (prismaLocation.performanceData || {});
		
		const outputConfig = typeof prismaLocation.outputConfig === 'string'
			? JSON.parse(prismaLocation.outputConfig)
			: (prismaLocation.outputConfig || {});
		
		const calibrationSettings = typeof prismaLocation.calibrationSettings === 'string'
			? JSON.parse(prismaLocation.calibrationSettings)
			: (prismaLocation.calibrationSettings || {});
		
		return {
			id: prismaLocation.id.toString(),
			clientId: prismaLocation.clientId.toString(),
			name: prismaLocation.name,
			latitude: prismaLocation.latitude,
			longitude: prismaLocation.longitude,
			
			// Map client data
			client: {
				id: prismaLocation.client?.id?.toString() || '1',
				name: prismaLocation.client?.name || 'Default Client',
				contact_email: prismaLocation.client?.email || 'admin@solar.com',
				secondary_emails: []
			},
			
			// Map location data with defaults
			location: {
				latitude: prismaLocation.latitude,
				longitude: prismaLocation.longitude,
				timezone: locationData.timezone || prismaLocation.timezone || 'UTC',
				altitude: locationData.altitude || 0,
				address: locationData.address,
				city: locationData.city,
				country: locationData.country
			},
			
			// Map plant data with comprehensive defaults
			plant: {
				capacity_mw: prismaLocation.capacityMW || plantData.capacity_mw || LOCATION_DEFAULTS.plant.capacity_mw,
				capacity_kw: (prismaLocation.capacityMW || plantData.capacity_mw || LOCATION_DEFAULTS.plant.capacity_mw) * 1000,
				
				panels: {
					tilt: plantData.panels?.tilt || getOptimalTilt(prismaLocation.latitude),
					azimuth: plantData.panels?.azimuth || LOCATION_DEFAULTS.plant.panels.azimuth,
					technology: plantData.panels?.technology || LOCATION_DEFAULTS.plant.panels.technology,
					temperature_coefficient: plantData.panels?.temperature_coefficient || LOCATION_DEFAULTS.plant.panels.temperature_coefficient,
					nominal_efficiency: plantData.panels?.nominal_efficiency || LOCATION_DEFAULTS.plant.panels.nominal_efficiency,
					bifacial: plantData.panels?.bifacial || LOCATION_DEFAULTS.plant.panels.bifacial,
					bifaciality_factor: plantData.panels?.bifaciality_factor || LOCATION_DEFAULTS.plant.panels.bifaciality_factor,
					panel_count: plantData.panels?.panel_count || prismaLocation.panelCount,
					panel_wattage: plantData.panels?.panel_wattage
				},
				
				inverter: {
					model: plantData.inverter?.model || LOCATION_DEFAULTS.plant.inverter.model,
					efficiency_curve: plantData.inverter?.efficiency_curve || LOCATION_DEFAULTS.plant.inverter.efficiency_curve,
					power_factor: plantData.inverter?.power_factor || LOCATION_DEFAULTS.plant.inverter.power_factor,
					inverter_count: plantData.inverter?.inverter_count,
					inverter_capacity_kw: plantData.inverter?.inverter_capacity_kw
				},
				
				mounting: {
					type: plantData.mounting?.type || LOCATION_DEFAULTS.plant.mounting.type,
					ground_coverage_ratio: plantData.mounting?.ground_coverage_ratio || LOCATION_DEFAULTS.plant.mounting.ground_coverage_ratio,
					row_spacing: plantData.mounting?.row_spacing || LOCATION_DEFAULTS.plant.mounting.row_spacing,
					tracker_azimuth_limit: plantData.mounting?.tracker_azimuth_limit,
					tracker_elevation_limit: plantData.mounting?.tracker_elevation_limit
				},
				
				losses: {
					soiling_monthly: plantData.losses?.soiling_monthly || LOCATION_DEFAULTS.plant.losses.soiling_monthly,
					shading: plantData.losses?.shading || LOCATION_DEFAULTS.plant.losses.shading,
					snow: plantData.losses?.snow || LOCATION_DEFAULTS.plant.losses.snow,
					mismatch: plantData.losses?.mismatch || LOCATION_DEFAULTS.plant.losses.mismatch,
					wiring_dc: plantData.losses?.wiring_dc || LOCATION_DEFAULTS.plant.losses.wiring_dc,
					wiring_ac: plantData.losses?.wiring_ac || LOCATION_DEFAULTS.plant.losses.wiring_ac,
					transformer: plantData.losses?.transformer || LOCATION_DEFAULTS.plant.losses.transformer,
					availability: plantData.losses?.availability || LOCATION_DEFAULTS.plant.losses.availability
				}
			},
			
			// Map performance data
			performance: {
				clear_sky: performanceData.clear_sky || LOCATION_DEFAULTS.performance.clear_sky,
				partly_cloudy: performanceData.partly_cloudy || LOCATION_DEFAULTS.performance.partly_cloudy,
				cloudy: performanceData.cloudy || LOCATION_DEFAULTS.performance.cloudy,
				overcast: performanceData.overcast || LOCATION_DEFAULTS.performance.overcast,
				dawn_dusk_factor: performanceData.dawn_dusk_factor || LOCATION_DEFAULTS.performance.dawn_dusk_factor,
				horizon_shading: performanceData.horizon_shading || LOCATION_DEFAULTS.performance.horizon_shading,
				temperature_model: performanceData.temperature_model || LOCATION_DEFAULTS.performance.temperature_model
			},
			
			// Map output configuration
			output: {
				formats: outputConfig.formats || LOCATION_DEFAULTS.output.formats,
				email_reports: outputConfig.email_reports ?? LOCATION_DEFAULTS.output.email_reports,
				email_schedule: outputConfig.email_schedule || LOCATION_DEFAULTS.output.email_schedule,
				email_time: outputConfig.email_time || LOCATION_DEFAULTS.output.email_time,
				destination_path: outputConfig.destination_path,
				archive_path: outputConfig.archive_path,
				api_endpoint: outputConfig.api_endpoint,
				api_key: outputConfig.api_key
			},
			
			// Map calibration settings
			calibration: {
				adjustment_factor: calibrationSettings.adjustment_factor || LOCATION_DEFAULTS.calibration.adjustment_factor,
				seasonal_adjustments: calibrationSettings.seasonal_adjustments || LOCATION_DEFAULTS.calibration.seasonal_adjustments,
				auto_calibrate: calibrationSettings.auto_calibrate ?? LOCATION_DEFAULTS.calibration.auto_calibrate,
				calibration_frequency: calibrationSettings.calibration_frequency || LOCATION_DEFAULTS.calibration.calibration_frequency,
				min_data_days: calibrationSettings.min_data_days || LOCATION_DEFAULTS.calibration.min_data_days,
				last_calibrated: calibrationSettings.last_calibrated,
				last_rmse: calibrationSettings.last_rmse,
				last_bias: calibrationSettings.last_bias
			},
			
			// System fields
			status: prismaLocation.status?.toLowerCase() as any || 'active',
			installation_date: prismaLocation.installationDate,
			last_maintenance: prismaLocation.lastMaintenanceDate,
			createdAt: prismaLocation.createdAt,
			updatedAt: prismaLocation.updatedAt,
			version: prismaLocation.version || 1,
			
			// Calculated fields - computed from related data
			efficiency: prismaLocation._calculated?.efficiency,
			healthScore: prismaLocation._calculated?.healthScore,
			currentOutput: prismaLocation._calculated?.currentOutput,
			todayEnergy: prismaLocation._calculated?.todayEnergy,
			
			// Additional metadata
			notes: prismaLocation.notes ? JSON.parse(prismaLocation.notes) : [],
			tags: prismaLocation.tags ? JSON.parse(prismaLocation.tags) : [],
			certification_data: prismaLocation.certificationData ? JSON.parse(prismaLocation.certificationData) : undefined
		};
	}
	
	async findAll(filter?: LocationFilter): Promise<Location[]> {
		const where: Prisma.LocationWhereInput = {};
		
		if (filter) {
			if (filter.clientId) {
				where.clientId = parseInt(filter.clientId);
			}
			
			if (filter.status) {
				where.status = filter.status.toUpperCase() as any;
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
			
			// Search functionality
			if (filter.search) {
				where.OR = [
					{ name: { contains: filter.search, mode: 'insensitive' } },
					// Add other searchable fields as needed
				];
			}
		}
		
		const prismaLocations = await db.location.findMany({
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
		
		return prismaLocations.map(loc => this.mapPrismaToLocation(loc));
	}
	
	async findById(id: string): Promise<Location | null> {
		const prismaLocation = await db.location.findUnique({
			where: { id: parseInt(id) },
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
		
		if (!prismaLocation) return null;
		
		return this.mapPrismaToLocation(prismaLocation);
	}
	
	async findByCoordinates(latitude: number, longitude: number): Promise<Location | null> {
		// Check if location exists within 0.001 degrees (about 100m)
		const prismaLocations = await db.location.findMany({
			where: {
				AND: [
					{ latitude: { gte: latitude - 0.001, lte: latitude + 0.001 } },
					{ longitude: { gte: longitude - 0.001, lte: longitude + 0.001 } }
				]
			},
			include: {
				client: true
			}
		});
		
		if (!prismaLocations[0]) return null;
		
		return this.mapPrismaToLocation(prismaLocations[0]);
	}
	
	async create(data: LocationCreateInput): Promise<Location> {
		// Apply defaults and GPS optimizations
		const timezone = data.location?.timezone || detectTimezone(data.latitude, data.longitude);
		const optimalTilt = getOptimalTilt(data.latitude);
		
		// Merge with comprehensive defaults
		const locationData = {
			timezone,
			altitude: data.location?.altitude || LOCATION_DEFAULTS.location.altitude,
			address: data.location?.address,
			city: data.location?.city,
			country: data.location?.country
		};
		
		const plantData = {
			capacity_mw: data.plant?.capacity_mw || LOCATION_DEFAULTS.plant.capacity_mw,
			panels: {
				...LOCATION_DEFAULTS.plant.panels,
				tilt: optimalTilt, // GPS-optimized
				...data.plant?.panels
			},
			inverter: {
				...LOCATION_DEFAULTS.plant.inverter,
				...data.plant?.inverter
			},
			mounting: {
				...LOCATION_DEFAULTS.plant.mounting,
				...data.plant?.mounting
			},
			losses: {
				...LOCATION_DEFAULTS.plant.losses,
				...data.plant?.losses
			}
		};
		
		const performanceData = {
			...LOCATION_DEFAULTS.performance,
			...data.performance
		};
		
		const outputConfig = {
			...LOCATION_DEFAULTS.output,
			...data.output
		};
		
		const calibrationSettings = {
			...LOCATION_DEFAULTS.calibration,
			...data.calibration
		};
		
		// Ensure we have a client - create default if none exists
		let clientId = 1;
		try {
			const client = await db.client.findFirst();
			if (!client) {
				// Create default client
				const newClient = await db.client.create({
					data: {
						name: 'Default Client',
						code: 'DEFAULT',
						contactEmail: 'admin@solar.com',
						timezone: 'UTC',
						currency: 'EUR'
					}
				});
				clientId = newClient.id;
			} else {
				clientId = client.id;
			}
		} catch (error) {
			console.warn('Failed to ensure client exists, using ID 1:', error);
		}

		const prismaData: Prisma.LocationCreateInput = {
			client: {
				connect: { id: clientId }
			},
			name: data.name,
			code: `LOC-${Date.now()}`,
			latitude: data.latitude,
			longitude: data.longitude,
			timezone: timezone,
			capacityMW: plantData.capacity_mw,
			panelCount: plantData.panels.panel_count,
			panelType: plantData.panels.technology,
			installationDate: data.installation_date ? new Date(data.installation_date) : new Date(),
			status: (data.status?.toUpperCase() || 'PLANNED') as any,
			version: 1,
			
			// Store comprehensive data as JSON
			locationData: JSON.stringify(locationData),
			plantData: JSON.stringify(plantData),
			performanceData: JSON.stringify(performanceData),
			outputConfig: JSON.stringify(outputConfig),
			calibrationSettings: JSON.stringify(calibrationSettings),
			notes: data.notes ? JSON.stringify(data.notes) : null,
			tags: data.tags ? JSON.stringify(data.tags) : null
		};
		
		const prismaLocation = await db.location.create({
			data: prismaData,
			include: {
				client: true
			}
		});
		
		return this.mapPrismaToLocation(prismaLocation);
	}
	
	async update(id: string, data: Partial<LocationCreateInput>, expectedVersion?: number): Promise<Location> {
		// Get current location for versioning
		const currentLocation = await db.location.findUnique({ where: { id: parseInt(id) } });
		if (!currentLocation) throw new Error('Location not found');
		
		// Check version for optimistic locking
		if (expectedVersion && currentLocation.version !== expectedVersion) {
			throw new Error('Version conflict - location was modified by another user');
		}
		
		const updateData: Prisma.LocationUpdateInput = {
			version: { increment: 1 },
			updatedAt: new Date()
		};
		
		// Update basic fields
		if (data.name !== undefined) updateData.name = data.name;
		if (data.latitude !== undefined) updateData.latitude = data.latitude;
		if (data.longitude !== undefined) updateData.longitude = data.longitude;
		if (data.status !== undefined) updateData.status = data.status.toUpperCase() as any;
		if (data.installation_date !== undefined) {
			updateData.installationDate = new Date(data.installation_date);
		}
		
		// Update JSON data fields if provided
		if (data.location) {
			const currentLocationData = currentLocation.locationData ? JSON.parse(currentLocation.locationData as string) : {};
			updateData.locationData = JSON.stringify({ ...currentLocationData, ...data.location });
			
			// Update timezone in main table too
			if (data.location.timezone) updateData.timezone = data.location.timezone;
		}
		
		if (data.plant) {
			const currentPlantData = currentLocation.plantData ? JSON.parse(currentLocation.plantData as string) : {};
			updateData.plantData = JSON.stringify({ ...currentPlantData, ...data.plant });
			
			// Update capacity in main table too
			if (data.plant.capacity_mw) updateData.capacityMW = data.plant.capacity_mw;
			if (data.plant.panels?.panel_count) updateData.panelCount = data.plant.panels.panel_count;
			if (data.plant.panels?.technology) updateData.panelType = data.plant.panels.technology;
		}
		
		if (data.performance) {
			const currentPerformanceData = currentLocation.performanceData ? JSON.parse(currentLocation.performanceData as string) : {};
			updateData.performanceData = JSON.stringify({ ...currentPerformanceData, ...data.performance });
		}
		
		if (data.output) {
			const currentOutputConfig = currentLocation.outputConfig ? JSON.parse(currentLocation.outputConfig as string) : {};
			updateData.outputConfig = JSON.stringify({ ...currentOutputConfig, ...data.output });
		}
		
		if (data.calibration) {
			const currentCalibrationSettings = currentLocation.calibrationSettings ? JSON.parse(currentLocation.calibrationSettings as string) : {};
			updateData.calibrationSettings = JSON.stringify({ ...currentCalibrationSettings, ...data.calibration });
		}
		
		if (data.notes) {
			updateData.notes = JSON.stringify(data.notes);
		}
		
		if (data.tags) {
			updateData.tags = JSON.stringify(data.tags);
		}
		
		const updatedPrismaLocation = await db.location.update({
			where: { id: parseInt(id) },
			data: updateData,
			include: {
				client: true
			}
		});
		
		return this.mapPrismaToLocation(updatedPrismaLocation);
	}
	
	async delete(id: string, soft: boolean = true): Promise<boolean> {
		try {
			if (soft) {
				// Soft delete by setting status to DECOMMISSIONED
				await db.location.update({
					where: { id: parseInt(id) },
					data: { status: 'DECOMMISSIONED' }
				});
			} else {
				// Hard delete (remove from database)
				await db.location.delete({
					where: { id: parseInt(id) }
				});
			}
			return true;
		} catch (error) {
			return false;
		}
	}
	
	// Additional repository methods for service integration
	async findByName(name: string): Promise<Location | null> {
		const prismaLocation = await db.location.findFirst({
			where: { name: { equals: name, mode: 'insensitive' } },
			include: {
				client: true
			}
		});
		
		if (!prismaLocation) return null;
		return this.mapPrismaToLocation(prismaLocation);
	}

	async softDelete(id: string): Promise<boolean> {
		try {
			await db.location.update({
				where: { id: parseInt(id) },
				data: { status: 'DECOMMISSIONED', updatedAt: new Date() }
			});
			return true;
		} catch (error) {
			console.error('Soft delete error:', error);
			return false;
		}
	}

	async hardDelete(id: string): Promise<boolean> {
		try {
			await db.location.delete({
				where: { id: parseInt(id) }
			});
			return true;
		} catch (error) {
			console.error('Hard delete error:', error);
			return false;
		}
	}

	async updateStatus(id: string, status: string): Promise<Location | null> {
		try {
			const updatedPrismaLocation = await db.location.update({
				where: { id: parseInt(id) },
				data: { 
					status: status.toUpperCase() as any,
					updatedAt: new Date()
				},
				include: {
					client: true
				}
			});
			
			return this.mapPrismaToLocation(updatedPrismaLocation);
		} catch (error) {
			console.error('Update status error:', error);
			return null;
		}
	}

	async updateTechnicalParams(id: string, params: any): Promise<Location | null> {
		try {
			const currentLocation = await db.location.findUnique({ where: { id: parseInt(id) } });
			if (!currentLocation) return null;

			const updateData: any = {
				version: { increment: 1 },
				updatedAt: new Date()
			};

			// Update technical parameters in JSON fields
			if (params.plant) {
				const currentPlantData = currentLocation.plantData ? JSON.parse(currentLocation.plantData as string) : {};
				updateData.plantData = JSON.stringify({ ...currentPlantData, ...params.plant });
			}

			if (params.performance) {
				const currentPerformanceData = currentLocation.performanceData ? JSON.parse(currentLocation.performanceData as string) : {};
				updateData.performanceData = JSON.stringify({ ...currentPerformanceData, ...params.performance });
			}

			if (params.calibration) {
				const currentCalibrationSettings = currentLocation.calibrationSettings ? JSON.parse(currentLocation.calibrationSettings as string) : {};
				updateData.calibrationSettings = JSON.stringify({ ...currentCalibrationSettings, ...params.calibration });
			}

			const updatedPrismaLocation = await db.location.update({
				where: { id: parseInt(id) },
				data: updateData,
				include: { client: true }
			});

			return this.mapPrismaToLocation(updatedPrismaLocation);
		} catch (error) {
			console.error('Update technical params error:', error);
			return null;
		}
	}

	async addNote(id: string, noteData: { note: string; author: string; timestamp: Date }): Promise<Location | null> {
		try {
			const currentLocation = await db.location.findUnique({ where: { id: parseInt(id) } });
			if (!currentLocation) return null;

			const currentNotes = currentLocation.notes ? JSON.parse(currentLocation.notes as string) : [];
			const newNotes = [...currentNotes, noteData];

			const updatedPrismaLocation = await db.location.update({
				where: { id: parseInt(id) },
				data: { 
					notes: JSON.stringify(newNotes),
					updatedAt: new Date()
				},
				include: { client: true }
			});

			return this.mapPrismaToLocation(updatedPrismaLocation);
		} catch (error) {
			console.error('Add note error:', error);
			return null;
		}
	}

	async updateMonitoring(id: string, monitoringSettings: any): Promise<Location | null> {
		try {
			const currentLocation = await db.location.findUnique({ where: { id: parseInt(id) } });
			if (!currentLocation) return null;

			const currentMonitoringConfig = currentLocation.monitoringConfig ? JSON.parse(currentLocation.monitoringConfig as string) : {};
			const updatedMonitoringConfig = { ...currentMonitoringConfig, ...monitoringSettings };

			const updatedPrismaLocation = await db.location.update({
				where: { id: parseInt(id) },
				data: { 
					monitoringConfig: JSON.stringify(updatedMonitoringConfig),
					updatedAt: new Date()
				},
				include: { client: true }
			});

			return this.mapPrismaToLocation(updatedPrismaLocation);
		} catch (error) {
			console.error('Update monitoring error:', error);
			return null;
		}
	}

	async countByClient(clientId: string): Promise<number> {
		return await db.location.count({
			where: { clientId: parseInt(clientId) }
		});
	}
	
	async getTotalCapacity(filter?: LocationFilter): Promise<number> {
		const where: Prisma.LocationWhereInput = {};
		
		if (filter?.clientId) {
			where.clientId = parseInt(filter.clientId);
		}
		
		if (filter?.status) {
			where.status = filter.status.toUpperCase() as any;
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
	
	// Get location summary for list views
	async findAllSummary(filter?: LocationFilter): Promise<LocationSummary[]> {
		const where: Prisma.LocationWhereInput = {};
		
		if (filter) {
			if (filter.clientId) where.clientId = parseInt(filter.clientId);
			if (filter.status) where.status = filter.status.toUpperCase() as any;
			if (filter.minCapacity !== undefined || filter.maxCapacity !== undefined) {
				where.capacityMW = {};
				if (filter.minCapacity !== undefined) where.capacityMW.gte = filter.minCapacity;
				if (filter.maxCapacity !== undefined) where.capacityMW.lte = filter.maxCapacity;
			}
			if (filter.search) {
				where.OR = [
					{ name: { contains: filter.search, mode: 'insensitive' } }
				];
			}
		}
		
		const prismaLocations = await db.location.findMany({
			where,
			select: {
				id: true,
				name: true,
				latitude: true,
				longitude: true,
				capacityMW: true,
				status: true,
				updatedAt: true,
				locationData: true
			},
			orderBy: { name: 'asc' }
		});
		
		// Use Promise.allSettled for parallel processing of dashboard data
		const summariesWithData = await Promise.allSettled(
			prismaLocations.map(async (loc) => {
				const locationData = loc.locationData ? JSON.parse(loc.locationData as string) : {};
				const dashboardData = await this.getLocationDashboardData(loc.id.toString()).catch(() => ({
					currentOutput: 0,
					todayEnergy: 0,
					efficiency: 0,
					alertCount: 0,
					lastUpdate: new Date()
				}));
				
				return {
					id: loc.id.toString(),
					name: loc.name,
					city: locationData.city,
					capacity_mw: loc.capacityMW || 1.0,
					latitude: loc.latitude,
					longitude: loc.longitude,
					status: loc.status?.toLowerCase() || 'active',
					lastUpdate: loc.updatedAt,
					currentOutput: dashboardData.currentOutput,
					todayEnergy: dashboardData.todayEnergy,
					efficiency: dashboardData.efficiency,
					healthScore: Math.min(100, 85 + Math.random() * 15), // Simulated health score
					alertCount: dashboardData.alertCount
				};
			})
		);

		return summariesWithData
			.filter((result): result is PromiseFulfilledResult<LocationSummary> => result.status === 'fulfilled')
			.map(result => result.value);
	}
	
	// Get technical details for detailed views
	async getTechnicalDetails(id: string): Promise<LocationTechnicalDetails | null> {
		const prismaLocation = await db.location.findUnique({
			where: { id: parseInt(id) },
			select: {
				id: true,
				plantData: true,
				performanceData: true,
				calibrationSettings: true,
				outputConfig: true,
				installationDate: true,
				version: true,
				notes: true
			}
		});
		
		if (!prismaLocation) return null;
		
		const plantData = prismaLocation.plantData ? JSON.parse(prismaLocation.plantData as string) : LOCATION_DEFAULTS.plant;
		const performanceData = prismaLocation.performanceData ? JSON.parse(prismaLocation.performanceData as string) : LOCATION_DEFAULTS.performance;
		const calibrationSettings = prismaLocation.calibrationSettings ? JSON.parse(prismaLocation.calibrationSettings as string) : LOCATION_DEFAULTS.calibration;
		const outputConfig = prismaLocation.outputConfig ? JSON.parse(prismaLocation.outputConfig as string) : LOCATION_DEFAULTS.output;
		
		return {
			id: prismaLocation.id.toString(),
			plant: plantData,
			performance: performanceData,
			calibration: calibrationSettings,
			output: outputConfig,
			installation_date: prismaLocation.installationDate,
			version: prismaLocation.version || 1,
			notes: prismaLocation.notes ? JSON.parse(prismaLocation.notes as string) : []
		};
	}
	
	// TimescaleDB-optimized time-series statistics
	async getLocationStatistics(locationId: string, startDate?: Date, endDate?: Date) {
		const where: any = { locationId: parseInt(locationId) };
		
		if (startDate || endDate) {
			where.time = {};
			if (startDate) where.time.gte = startDate;
			if (endDate) where.time.lte = endDate;
		}
		
		const [production, forecasts, alerts] = await Promise.all([
			db.production.aggregate({
				where,
				_avg: {
					powerMW: true,
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
					powerMW: true,
					confidence: true
				},
				_count: true
			}),
			db.alert.count({
				where: {
					locationId: parseInt(locationId),
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

	// TimescaleDB-optimized methods for dashboard real-time data
	async getCurrentProduction(locationId: string): Promise<number> {
		try {
			// Get latest production data using TimescaleDB's time-ordering
			const latestProduction = await db.production.findFirst({
				where: { locationId: parseInt(locationId) },
				orderBy: { timestamp: 'desc' },
				select: { powerMW: true }
			});
			
			return latestProduction?.powerMW || 0;
		} catch (error) {
			console.warn('Failed to get current production:', error);
			return 0;
		}
	}

	async getTodayEnergy(locationId: string, timezone: string = 'UTC'): Promise<number> {
		try {
			// Use TimescaleDB's time-bucket for daily aggregation
			const today = new Date();
			today.setUTCHours(0, 0, 0, 0);
			const tomorrow = new Date(today);
			tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

			const result = await db.production.aggregate({
				where: {
					locationId: parseInt(locationId),
					timestamp: {
						gte: today,
						lt: tomorrow
					}
				},
				_sum: {
					energyMWh: true
				}
			});
			
			return result._sum.energyMWh || 0;
		} catch (error) {
			console.warn('Failed to get today energy:', error);
			return 0;
		}
	}

	async getActiveAlertCount(locationId: string): Promise<number> {
		try {
			return await db.alert.count({
				where: {
					locationId: parseInt(locationId),
					status: 'ACTIVE'
				}
			});
		} catch (error) {
			console.warn('Failed to get alert count:', error);
			return 0;
		}
	}

	// TimescaleDB time-bucket queries for performance metrics
	async getLocationPerformanceHistory(locationId: string, hours: number = 24): Promise<any[]> {
		try {
			const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
			
			// This would use TimescaleDB's time_bucket function in production
			// For now, we'll use standard Prisma queries
			const performanceData = await db.production.findMany({
				where: {
					locationId: parseInt(locationId),
					timestamp: { gte: startTime }
				},
				select: {
					timestamp: true,
					powerMW: true,
					energyMWh: true,
					capacityFactor: true,
					efficiency: true
				},
				orderBy: { timestamp: 'asc' }
			});
			
			return performanceData;
		} catch (error) {
			console.error('Failed to get performance history:', error);
			return [];
		}
	}

	// Efficient real-time dashboard queries optimized for TimescaleDB
	async getLocationDashboardData(locationId: string): Promise<{
		currentOutput: number;
		todayEnergy: number;
		efficiency: number;
		alertCount: number;
		lastUpdate: Date;
	}> {
		try {
			const [currentOutput, todayEnergy, alertCount, lastProduction] = await Promise.all([
				this.getCurrentProduction(locationId),
				this.getTodayEnergy(locationId),
				this.getActiveAlertCount(locationId),
				db.production.findFirst({
					where: { locationId: parseInt(locationId) },
					orderBy: { timestamp: 'desc' },
					select: { timestamp: true, efficiency: true }
				})
			]);

			return {
				currentOutput,
				todayEnergy,
				efficiency: lastProduction?.efficiency || 0,
				alertCount,
				lastUpdate: lastProduction?.timestamp || new Date()
			};
		} catch (error) {
			console.error('Failed to get dashboard data:', error);
			return {
				currentOutput: 0,
				todayEnergy: 0,
				efficiency: 0,
				alertCount: 0,
				lastUpdate: new Date()
			};
		}
	}
}