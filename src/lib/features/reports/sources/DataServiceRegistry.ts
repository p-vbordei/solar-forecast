import type { DataService, ReportData } from '../models/ReportTypes';

/**
 * Default mock data service for v1
 */
class DefaultDataService implements DataService {
    async fetch(from: Date, to: Date, tz?: string): Promise<ReportData> {
        // Generate mock data based on date range
        const rows = [];
        const sites = ['Solar Farm A', 'Solar Farm B', 'Solar Farm C', 'Wind Park D'];

        // Calculate hours between dates
        const hoursDiff = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60));
        const hoursToGenerate = Math.min(hoursDiff, 1000); // Cap at 1000 rows for demo

        // Generate hourly data
        for (let i = 0; i < hoursToGenerate; i++) {
            const timestamp = new Date(from.getTime() + i * 60 * 60 * 1000);
            const site = sites[i % sites.length];

            // Generate realistic-looking data with some variation
            const baseQty = 50 + Math.floor(Math.random() * 100);
            const seasonalFactor = 1 + 0.3 * Math.sin(i / 24 * Math.PI); // Daily pattern
            const qty = Math.floor(baseQty * seasonalFactor);

            // Price varies by time of day (peak/off-peak)
            const hour = timestamp.getHours();
            const isPeak = hour >= 7 && hour <= 20;
            const basePrice = isPeak ? 45 : 25;
            const price = basePrice + Math.random() * 10;

            rows.push({
                timestamp,
                site,
                qty,
                price: Math.round(price * 100) / 100 // Round to 2 decimals
            });
        }

        console.log(`[DefaultDataService] Generated ${rows.length} rows for period ${from.toISOString()} to ${to.toISOString()}`);

        return { rows };
    }
}

/**
 * Registry for data services
 */
export class DataServiceRegistry {
    private services: Map<string, DataService> = new Map();

    constructor() {
        // Register default data service
        this.services.set('default', new DefaultDataService());

        // Future: Register real data services here
        // this.services.set('production', new ProductionDataService());
        // this.services.set('forecast', new ForecastDataService());
        // this.services.set('weather', new WeatherDataService());
    }

    /**
     * Get data service by key
     */
    getDataService(key: string): DataService | undefined {
        return this.services.get(key);
    }

    /**
     * Register a new data service
     */
    registerDataService(key: string, service: DataService): void {
        this.services.set(key, service);
    }

    /**
     * Get all available data service keys
     */
    getAvailableServices(): string[] {
        return Array.from(this.services.keys());
    }
}