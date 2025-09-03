import type { Location, LocationCreateInput, LocationFilter } from '$lib/types/location';

// Repository - handles data access
export class LocationRepository {
	// Mock data for now - will be replaced with Prisma
	private locations: Location[] = [
		{
			id: 1,
			clientId: 1,
			name: 'Solar Farm Alpha',
			latitude: 44.4268,
			longitude: 26.1025,
			timezone: 'Europe/Bucharest',
			capacity: 25.5,
			panelCount: 5000,
			panelType: 'Monocrystalline',
			installationDate: new Date('2022-01-15'),
			lastMaintenance: new Date('2024-10-15'),
			status: 'active',
			createdAt: new Date('2022-01-01'),
			updatedAt: new Date('2024-10-15')
		},
		{
			id: 2,
			clientId: 1,
			name: 'Solar Station Beta',
			latitude: 45.6578,
			longitude: 25.6012,
			timezone: 'Europe/Bucharest',
			capacity: 18.3,
			panelCount: 3500,
			panelType: 'Polycrystalline',
			installationDate: new Date('2021-06-20'),
			lastMaintenance: new Date('2024-09-10'),
			status: 'active',
			createdAt: new Date('2021-06-01'),
			updatedAt: new Date('2024-09-10')
		},
		{
			id: 3,
			clientId: 2,
			name: 'Green Energy Park',
			latitude: 46.7712,
			longitude: 23.6236,
			timezone: 'Europe/Bucharest',
			capacity: 42.0,
			panelCount: 8000,
			panelType: 'Bifacial',
			installationDate: new Date('2023-03-10'),
			lastMaintenance: new Date('2024-11-01'),
			status: 'maintenance',
			createdAt: new Date('2023-03-01'),
			updatedAt: new Date('2024-11-01')
		}
	];
	
	async findAll(filter?: LocationFilter): Promise<Location[]> {
		let results = [...this.locations];
		
		if (filter) {
			if (filter.clientId !== undefined) {
				results = results.filter(l => l.clientId === filter.clientId);
			}
			
			if (filter.status) {
				results = results.filter(l => l.status === filter.status);
			}
			
			if (filter.minCapacity !== undefined) {
				results = results.filter(l => l.capacity >= filter.minCapacity!);
			}
			
			if (filter.maxCapacity !== undefined) {
				results = results.filter(l => l.capacity <= filter.maxCapacity!);
			}
		}
		
		return results;
	}
	
	async findById(id: number): Promise<Location | null> {
		return this.locations.find(l => l.id === id) || null;
	}
	
	async findByCoordinates(latitude: number, longitude: number): Promise<Location | null> {
		// Check if location exists within 0.001 degrees (about 100m)
		return this.locations.find(l => 
			Math.abs(l.latitude - latitude) < 0.001 &&
			Math.abs(l.longitude - longitude) < 0.001
		) || null;
	}
	
	async create(data: LocationCreateInput): Promise<Location> {
		const newLocation: Location = {
			id: Math.max(...this.locations.map(l => l.id)) + 1,
			clientId: data.clientId || 1,
			name: data.name,
			latitude: data.latitude,
			longitude: data.longitude,
			timezone: data.timezone || 'UTC',
			capacity: data.capacity,
			panelCount: data.panelCount,
			panelType: data.panelType || 'Monocrystalline',
			installationDate: data.installationDate ? new Date(data.installationDate) : new Date(),
			lastMaintenance: null,
			status: 'active',
			createdAt: new Date(),
			updatedAt: new Date()
		};
		
		this.locations.push(newLocation);
		return newLocation;
	}
	
	async update(id: number, data: Partial<LocationCreateInput>): Promise<Location> {
		const index = this.locations.findIndex(l => l.id === id);
		
		if (index === -1) {
			throw new Error('Location not found');
		}
		
		const updated: Location = {
			...this.locations[index],
			...data,
			updatedAt: new Date()
		};
		
		this.locations[index] = updated;
		return updated;
	}
	
	async delete(id: number): Promise<boolean> {
		const index = this.locations.findIndex(l => l.id === id);
		
		if (index === -1) {
			return false;
		}
		
		this.locations.splice(index, 1);
		return true;
	}
	
	// Additional repository methods
	async countByClient(clientId: number): Promise<number> {
		return this.locations.filter(l => l.clientId === clientId).length;
	}
	
	async getTotalCapacity(filter?: LocationFilter): Promise<number> {
		const locations = await this.findAll(filter);
		return locations.reduce((sum, l) => sum + l.capacity, 0);
	}
	
	async getLocationsByStatus(): Promise<Record<string, number>> {
		const statusCount: Record<string, number> = {
			active: 0,
			maintenance: 0,
			offline: 0
		};
		
		this.locations.forEach(l => {
			statusCount[l.status] = (statusCount[l.status] || 0) + 1;
		});
		
		return statusCount;
	}
}