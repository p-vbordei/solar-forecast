import * as cron from 'node-cron';
import { scheduledReportService } from './scheduled-report.service';
import { reportExecutionService } from './report-execution.service';

export class SchedulerService {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[SchedulerService] Already running');
      return;
    }

    console.log('[SchedulerService] Starting scheduler service');
    this.isRunning = true;

    // Check for due reports every minute
    this.checkInterval = setInterval(async () => {
      await this.checkAndExecuteDueReports();
    }, 60000); // 1 minute

    // Run initial check
    await this.checkAndExecuteDueReports();

    console.log('[SchedulerService] Scheduler service started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('[SchedulerService] Stopping scheduler service');

    // Clear the check interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Stop all cron tasks
    this.tasks.forEach((task, id) => {
      task.stop();
      console.log(`[SchedulerService] Stopped task: ${id}`);
    });

    this.tasks.clear();
    this.isRunning = false;

    console.log('[SchedulerService] Scheduler service stopped');
  }

  /**
   * Check and execute due reports
   */
  private async checkAndExecuteDueReports(): Promise<void> {
    try {
      // Get all reports that are due
      const dueReports = await scheduledReportService.getDueReports();

      if (dueReports.length === 0) {
        return;
      }

      console.log(`[SchedulerService] Found ${dueReports.length} due reports`);

      // Execute each due report
      for (const report of dueReports) {
        // Don't execute the same report multiple times in parallel
        if (this.tasks.has(report.id)) {
          continue;
        }

        // Mark as executing
        const task = cron.schedule('* * * * * *', () => {}); // Dummy task
        this.tasks.set(report.id, task);

        // Execute the report asynchronously
        this.executeReport(report)
          .finally(() => {
            // Remove from executing tasks
            const existingTask = this.tasks.get(report.id);
            if (existingTask) {
              existingTask.stop();
            }
            this.tasks.delete(report.id);
          });
      }
    } catch (error) {
      console.error('[SchedulerService] Error checking due reports:', error);
    }
  }

  /**
   * Execute a scheduled report
   */
  private async executeReport(report: any): Promise<void> {
    const startTime = Date.now();
    console.log(`[SchedulerService] Executing report: ${report.id} - ${report.name}`);

    try {
      // Execute the report
      await reportExecutionService.executeScheduledReport(report);

      const duration = Date.now() - startTime;
      console.log(`[SchedulerService] Report executed successfully: ${report.id} (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[SchedulerService] Report execution failed: ${report.id} (${duration}ms)`, error);
    }
  }

  /**
   * Schedule a specific report
   */
  async scheduleReport(reportId: string, cronExpression: string): Promise<void> {
    // Stop existing task if any
    const existingTask = this.tasks.get(reportId);
    if (existingTask) {
      existingTask.stop();
    }

    // Create new cron task
    const task = cron.schedule(cronExpression, async () => {
      try {
        const report = await scheduledReportService.getUserScheduledReports(1)
          .then(reports => reports.find(r => r.id === reportId));

        if (report && report.isActive) {
          await this.executeReport(report);
        }
      } catch (error) {
        console.error(`[SchedulerService] Error executing scheduled report ${reportId}:`, error);
      }
    });

    this.tasks.set(reportId, task);
    console.log(`[SchedulerService] Scheduled report: ${reportId} with cron: ${cronExpression}`);
  }

  /**
   * Unschedule a report
   */
  unscheduleReport(reportId: string): void {
    const task = this.tasks.get(reportId);
    if (task) {
      task.stop();
      this.tasks.delete(reportId);
      console.log(`[SchedulerService] Unscheduled report: ${reportId}`);
    }
  }

  /**
   * Convert frequency to cron expression
   */
  frequencyToCron(frequency: string, time: string): string {
    const [hours, minutes] = time.split(':').map(Number);

    switch (frequency.toUpperCase()) {
      case 'DAILY':
        return `${minutes} ${hours} * * *`;
      case 'WEEKLY':
        return `${minutes} ${hours} * * 1`; // Every Monday
      case 'MONTHLY':
        return `${minutes} ${hours} 1 * *`; // First day of month
      case 'QUARTERLY':
        return `${minutes} ${hours} 1 */3 *`; // Every 3 months
      default:
        return `${minutes} ${hours} * * *`; // Default to daily
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    tasksCount: number;
    tasks: string[];
  } {
    return {
      isRunning: this.isRunning,
      tasksCount: this.tasks.size,
      tasks: Array.from(this.tasks.keys())
    };
  }

  /**
   * Clean up old execution records
   */
  async cleanupOldExecutions(daysToKeep: number = 30): Promise<number> {
    try {
      const deleted = await scheduledReportService.cleanOldExecutions(daysToKeep);
      console.log(`[SchedulerService] Cleaned up ${deleted} old execution records`);
      return deleted;
    } catch (error) {
      console.error('[SchedulerService] Error cleaning up old executions:', error);
      return 0;
    }
  }
}

// Create singleton instance
export const schedulerService = new SchedulerService();

// Start scheduler on module load in production
if (process.env.NODE_ENV === 'production' || process.env.START_SCHEDULER === 'true') {
  schedulerService.start().catch(error => {
    console.error('[SchedulerService] Failed to start scheduler:', error);
  });
}