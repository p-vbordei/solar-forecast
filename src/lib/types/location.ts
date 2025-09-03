export interface Location {
	id: number;
	clientId: number;
	name: string;
	latitude: number;
	longitude: number;
	timezone: string;
	capacity: number; // in MW
	panelCount?: number;
	panelType?: string;
	installationDate?: Date;
	lastMaintenance?: Date | null;
	status: 'active' | 'maintenance' | 'offline';
	createdAt: Date;
	updatedAt: Date;
	
	// Calculated fields from service
	efficiency?: number;
	healthScore?: number;
}

export interface LocationCreateInput {
	clientId?: number;
	name: string;
	latitude: number;
	longitude: number;
	timezone?: string;
	capacity: number;
	panelCount?: number;
	panelType?: string;
	installationDate?: string | Date;
}

export interface LocationFilter {
	clientId?: number;
	status?: 'active' | 'maintenance' | 'offline';
	minCapacity?: number;
	maxCapacity?: number;
}