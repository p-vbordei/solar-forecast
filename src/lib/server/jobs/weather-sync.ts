import { WeatherService } from '../../features/weather/services/WeatherService';
import type { SyncWeatherRequest } from '../../features/weather/models/requests/SyncWeatherRequest';

/**
 * Scheduled job for weather data synchronization
 * Fetches weather data from Open-Meteo API and stores in TimescaleDB
 */
export class WeatherSyncJob {
  private weatherService = new WeatherService();
  private isRunning = false;

  /**
   * Execute weather sync for all active locations
   */
  async execute(options: {
    includeForecasts?: boolean;
    forecastDays?: number;
    batchSize?: number;
    forceRefresh?: boolean;
  } = {}): Promise<void> {
    if (this.isRunning) {
      console.warn('Weather sync job already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('Starting scheduled weather sync job');

    try {
      const syncRequest: SyncWeatherRequest = {
        includeForecasts: options.includeForecasts !== false, // Default: true
        forecastDays: options.forecastDays || 7,
        batchSize: options.batchSize || 1000,
        forceRefresh: options.forceRefresh || false,
        validateData: true,
        skipDuplicates: !options.forceRefresh
      };

      const result = await this.weatherService.syncAllLocations(syncRequest);

      if (result.success) {
        console.log('Weather sync job completed successfully:', {
          locationsProcessed: result.stats.locationsProcessed,
          recordsInserted: result.stats.recordsInserted,
          recordsUpdated: result.stats.recordsUpdated,
          processingTimeMs: result.stats.processingTimeMs
        });
      } else {
        console.error('Weather sync job completed with errors:', {
          message: result.message,
          stats: result.stats,
          errorCount: result.errors?.length || 0
        });

        // Log individual errors
        if (result.errors) {
          result.errors.forEach(error => {
            console.error(`Weather sync error for location ${error.locationId}:`, error.error);
          });
        }
      }

    } catch (error) {
      console.error('Weather sync job failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute current weather sync only (no forecasts)
   */
  async executeCurrentWeatherOnly(): Promise<void> {
    await this.execute({
      includeForecasts: false,
      batchSize: 500 // Smaller batch for current weather
    });
  }

  /**
   * Execute full sync with forecasts
   */
  async executeFullSync(): Promise<void> {
    await this.execute({
      includeForecasts: true,
      forecastDays: 7,
      batchSize: 1000,
      forceRefresh: true
    });
  }

  /**
   * Check if job is currently running
   */
  isJobRunning(): boolean {
    return this.isRunning;
  }
}

/**
 * Global weather sync job instance
 */
export const weatherSyncJob = new WeatherSyncJob();

/**
 * Cron-style scheduler functions
 */
export class WeatherSyncScheduler {
  private intervals: NodeJS.Timeout[] = [];
  private isScheduled = false;

  /**
   * Start the weather sync scheduler
   */
  start(): void {
    if (this.isScheduled) {
      console.warn('Weather sync scheduler already started');
      return;
    }

    console.log('Starting weather sync scheduler');

    // Schedule current weather sync every 15 minutes
    const currentWeatherInterval = setInterval(async () => {
      console.log('Executing scheduled current weather sync');
      await weatherSyncJob.executeCurrentWeatherOnly();
    }, 15 * 60 * 1000); // 15 minutes

    // Schedule full forecast sync every hour
    const forecastInterval = setInterval(async () => {
      console.log('Executing scheduled forecast sync');
      await weatherSyncJob.executeFullSync();
    }, 60 * 60 * 1000); // 1 hour

    // Schedule cleanup every day at 2 AM (relative to server time)
    const cleanupInterval = setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() < 15) {
        console.log('Executing scheduled weather data cleanup');
        try {
          const deletedCount = await new WeatherService().cleanupOldData(90); // Keep 90 days
          console.log(`Cleaned up ${deletedCount} old weather records`);
        } catch (error) {
          console.error('Weather data cleanup failed:', error);
        }
      }
    }, 15 * 60 * 1000); // Check every 15 minutes for cleanup time

    this.intervals = [currentWeatherInterval, forecastInterval, cleanupInterval];
    this.isScheduled = true;

    console.log('Weather sync scheduler started successfully');
  }

  /**
   * Stop the weather sync scheduler
   */
  stop(): void {
    if (!this.isScheduled) {
      console.warn('Weather sync scheduler not running');
      return;
    }

    console.log('Stopping weather sync scheduler');

    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.isScheduled = false;

    console.log('Weather sync scheduler stopped');
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.isScheduled;
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    activeIntervals: number;
    jobRunning: boolean;
  } {
    return {
      isRunning: this.isScheduled,
      activeIntervals: this.intervals.length,
      jobRunning: weatherSyncJob.isJobRunning()
    };
  }
}

/**
 * Global weather sync scheduler instance
 */
export const weatherSyncScheduler = new WeatherSyncScheduler();

/**
 * Initialize weather sync scheduler on server start
 * Call this from your main application startup
 */
export function initializeWeatherSync(): void {
  console.log('Initializing weather synchronization system');

  // Start the scheduler
  weatherSyncScheduler.start();

  // Run an initial sync
  setTimeout(async () => {
    console.log('Running initial weather sync');
    await weatherSyncJob.executeFullSync();
  }, 5000); // Wait 5 seconds after startup

  // Graceful shutdown handling
  process.on('SIGINT', () => {
    console.log('Shutting down weather sync scheduler...');
    weatherSyncScheduler.stop();
  });

  process.on('SIGTERM', () => {
    console.log('Shutting down weather sync scheduler...');
    weatherSyncScheduler.stop();
  });
}

/**
 * Manual trigger functions for external use
 */
export const weatherSyncTriggers = {
  /**
   * Trigger immediate current weather sync
   */
  async triggerCurrentWeatherSync(): Promise<void> {
    console.log('Manual trigger: current weather sync');
    await weatherSyncJob.executeCurrentWeatherOnly();
  },

  /**
   * Trigger immediate full sync with forecasts
   */
  async triggerFullSync(): Promise<void> {
    console.log('Manual trigger: full weather sync');
    await weatherSyncJob.executeFullSync();
  },

  /**
   * Trigger weather data cleanup
   */
  async triggerCleanup(olderThanDays: number = 90): Promise<number> {
    console.log(`Manual trigger: weather data cleanup (${olderThanDays} days)`);
    const deletedCount = await new WeatherService().cleanupOldData(olderThanDays);
    console.log(`Cleanup completed: ${deletedCount} records deleted`);
    return deletedCount;
  }
};

export default weatherSyncJob;