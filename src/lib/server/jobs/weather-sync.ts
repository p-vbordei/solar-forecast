import { WeatherService } from "../../features/weather/services/WeatherService";
import type { SyncWeatherRequest } from "../../features/weather/models/requests/SyncWeatherRequest";

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
  async execute(
    options: {
      includeForecasts?: boolean;
      forecastDays?: number;
      batchSize?: number;
      forceRefresh?: boolean;
    } = {},
  ): Promise<void> {
    if (this.isRunning) {
      console.warn("Weather sync job already running, skipping...");
      return;
    }

    this.isRunning = true;
    console.log("Starting scheduled weather sync job");

    try {
      const syncRequest: SyncWeatherRequest = {
        includeForecasts: options.includeForecasts !== false, // Default: true
        forecastDays: options.forecastDays || 7,
        batchSize: options.batchSize || 1000,
        forceRefresh: options.forceRefresh || false,
        validateData: true,
        skipDuplicates: !options.forceRefresh,
      };

      const result = await this.weatherService.syncAllLocations(syncRequest);

      if (result.success) {
        console.log("Weather sync job completed successfully:", {
          locationsProcessed: result.stats.locationsProcessed,
          recordsInserted: result.stats.recordsInserted,
          recordsUpdated: result.stats.recordsUpdated,
          processingTimeMs: result.stats.processingTimeMs,
        });
      } else {
        console.error("Weather sync job completed with errors:", {
          message: result.message,
          stats: result.stats,
          errorCount: result.errors?.length || 0,
        });

        // Log individual errors
        if (result.errors) {
          result.errors.forEach((error) => {
            console.error(
              `Weather sync error for location ${error.locationId}:`,
              error.error,
            );
          });
        }
      }
    } catch (error) {
      console.error("Weather sync job failed:", error);
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
      batchSize: 500, // Smaller batch for current weather
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
      forceRefresh: true,
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
   * Start the weather sync scheduler - Daily sync at UTC 08:00
   */
  start(): void {
    if (this.isScheduled) {
      console.warn("Weather sync scheduler already started");
      return;
    }

    console.log("Starting weather sync scheduler - Daily sync at UTC 08:00");

    // Schedule daily weather sync at UTC 08:00
    const dailySyncInterval = setInterval(
      async () => {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const utcMinute = now.getUTCMinutes();

        // Execute at UTC 08:00 (allow 10 minute window to avoid missing)
        if (utcHour === 8 && utcMinute < 10) {
          console.log("Executing daily weather sync at UTC 08:00");
          await weatherSyncJob.executeFullSync();
        }
      },
      10 * 60 * 1000,
    ); // Check every 10 minutes

    // Schedule cleanup once per week at UTC 02:00 on Sunday
    const weeklyCleanupInterval = setInterval(
      async () => {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const utcMinute = now.getUTCMinutes();
        const dayOfWeek = now.getUTCDay(); // 0 = Sunday

        if (dayOfWeek === 0 && utcHour === 2 && utcMinute < 10) {
          console.log("Executing weekly weather data cleanup");
          try {
            const deletedCount = await new WeatherService().cleanupOldData(90); // Keep 90 days
            console.log(`Cleaned up ${deletedCount} old weather records`);
          } catch (error) {
            console.error("Weather data cleanup failed:", error);
          }
        }
      },
      10 * 60 * 1000,
    ); // Check every 10 minutes

    this.intervals = [dailySyncInterval, weeklyCleanupInterval];
    this.isScheduled = true;

    console.log("Weather sync scheduler started - Daily sync at UTC 08:00");
  }

  /**
   * Stop the weather sync scheduler
   */
  stop(): void {
    if (!this.isScheduled) {
      console.warn("Weather sync scheduler not running");
      return;
    }

    console.log("Stopping weather sync scheduler");

    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals = [];
    this.isScheduled = false;

    console.log("Weather sync scheduler stopped");
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
      jobRunning: weatherSyncJob.isJobRunning(),
    };
  }
}

/**
 * Global weather sync scheduler instance
 */
export const weatherSyncScheduler = new WeatherSyncScheduler();

// Store shutdown handlers to prevent multiple registrations
let shutdownHandlersRegistered = false;

/**
 * Shutdown handler function
 */
const handleShutdown = (signal: string) => {
  return () => {
    if (weatherSyncScheduler.isRunning()) {
      console.log(
        `${signal} received: Shutting down weather sync scheduler...`,
      );
      weatherSyncScheduler.stop();
    }

    // Exit after cleanup (with small delay to allow logs to flush)
    setTimeout(() => {
      process.exit(0);
    }, 100);
  };
};

/**
 * Initialize weather sync scheduler on server start
 * Call this from your main application startup
 */
export function initializeWeatherSync(): void {
  // Prevent multiple initializations
  if (weatherSyncScheduler.isRunning()) {
    console.log("Weather sync scheduler already initialized");
    return;
  }

  console.log("Initializing weather synchronization system");

  // Start the scheduler
  weatherSyncScheduler.start();

  // Run an initial sync
  setTimeout(async () => {
    console.log("Running initial weather sync");
    await weatherSyncJob.executeFullSync();
  }, 5000); // Wait 5 seconds after startup

  // Register shutdown handlers only once
  if (!shutdownHandlersRegistered) {
    const sigintHandler = handleShutdown("SIGINT");
    const sigtermHandler = handleShutdown("SIGTERM");

    process.once("SIGINT", sigintHandler);
    process.once("SIGTERM", sigtermHandler);

    shutdownHandlersRegistered = true;
  }
}

/**
 * Manual trigger functions for external use
 */
export const weatherSyncTriggers = {
  /**
   * Trigger immediate current weather sync
   */
  async triggerCurrentWeatherSync(): Promise<void> {
    console.log("Manual trigger: current weather sync");
    await weatherSyncJob.executeCurrentWeatherOnly();
  },

  /**
   * Trigger immediate full sync with forecasts
   */
  async triggerFullSync(): Promise<void> {
    console.log("Manual trigger: full weather sync");
    await weatherSyncJob.executeFullSync();
  },

  /**
   * Trigger weather data cleanup
   */
  async triggerCleanup(olderThanDays: number = 90): Promise<number> {
    console.log(`Manual trigger: weather data cleanup (${olderThanDays} days)`);
    const deletedCount = await new WeatherService().cleanupOldData(
      olderThanDays,
    );
    console.log(`Cleanup completed: ${deletedCount} records deleted`);
    return deletedCount;
  },
};

export default weatherSyncJob;
