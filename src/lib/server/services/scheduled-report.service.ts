import { scheduledReportRepository } from '../repositories/scheduled-report.repository';
import type { ScheduledReport, ScheduleFrequency } from '$lib/types/report';
import type { Prisma } from '@prisma/client';

export class ScheduledReportService {
  /**
   * Calculate next run time based on frequency and current time
   */
  calculateNextRun(
    frequency: ScheduleFrequency,
    scheduleTime: string,
    startDate: Date,
    timezone: string = 'UTC',
    lastRun?: Date
  ): Date {
    const [hours, minutes] = scheduleTime.split(':').map(Number);
    const baseDate = lastRun ? new Date(lastRun) : new Date(startDate);
    const nextRun = new Date(baseDate);

    // Set the scheduled time
    nextRun.setHours(hours, minutes, 0, 0);

    // Calculate based on frequency
    switch (frequency) {
      case 'DAILY':
        if (lastRun) {
          nextRun.setDate(nextRun.getDate() + 1);
        } else if (nextRun <= new Date()) {
          // If first run and time has passed today, schedule for tomorrow
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case 'WEEKLY':
        if (lastRun) {
          nextRun.setDate(nextRun.getDate() + 7);
        } else {
          // Set to the same day of week as start date
          const startDayOfWeek = startDate.getDay();
          const currentDayOfWeek = nextRun.getDay();
          const daysToAdd = (startDayOfWeek - currentDayOfWeek + 7) % 7;

          if (daysToAdd === 0 && nextRun <= new Date()) {
            // If today is the scheduled day but time has passed, schedule for next week
            nextRun.setDate(nextRun.getDate() + 7);
          } else {
            nextRun.setDate(nextRun.getDate() + daysToAdd);
          }
        }
        break;

      case 'MONTHLY':
        if (lastRun) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        } else {
          // Set to the same day of month as start date
          nextRun.setDate(startDate.getDate());
          if (nextRun <= new Date()) {
            // If this month's date has passed, schedule for next month
            nextRun.setMonth(nextRun.getMonth() + 1);
          }
        }
        break;

      case 'QUARTERLY':
        if (lastRun) {
          nextRun.setMonth(nextRun.getMonth() + 3);
        } else {
          // Set to the same day as start date
          nextRun.setDate(startDate.getDate());
          if (nextRun <= new Date()) {
            // If this quarter's date has passed, schedule for next quarter
            nextRun.setMonth(nextRun.getMonth() + 3);
          }
        }
        break;

      default:
        // For CUSTOM or unknown, default to daily
        nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
  }

  /**
   * Create a scheduled report
   */
  async createScheduledReport(data: {
    userId: number;
    reportType: string;
    name: string;
    description?: string;
    parameters: any;
    filters?: any;
    frequency: ScheduleFrequency;
    scheduleTime: string;
    startDate: Date;
    timezone?: string;
    scheduleDescription?: string;
    format?: string;
    aggregationLevel?: string;
    selectedTimezone?: string;
    emailRecipients: string[];
    emailEnabled?: boolean;
    locationIds?: string[];
    locationDisplay?: string;
    plantIds?: string[];
  }): Promise<ScheduledReport> {
    // Calculate first run time
    const nextRunAt = this.calculateNextRun(
      data.frequency,
      data.scheduleTime,
      data.startDate,
      data.timezone || 'UTC'
    );

    // Create the scheduled report
    const scheduledReport = await scheduledReportRepository.create({
      userId: data.userId,
      reportType: data.reportType as any,
      name: data.name,
      description: data.description,
      parameters: data.parameters || {},
      filters: data.filters || {},
      frequency: data.frequency as any,
      scheduleTime: data.scheduleTime,
      startDate: data.startDate,
      timezone: data.timezone || 'UTC',
      scheduleDescription: data.scheduleDescription,
      format: (data.format?.toUpperCase() || 'PDF') as any,
      aggregationLevel: data.aggregationLevel,
      selectedTimezone: data.selectedTimezone,
      emailRecipients: data.emailRecipients || [],
      emailEnabled: data.emailEnabled !== false,
      locationIds: data.locationIds || [],
      locationDisplay: (data.locationDisplay?.toUpperCase() || 'INDIVIDUAL') as any,
      plantIds: data.plantIds || [],
      isActive: true,
      nextRunAt
    });

    return scheduledReport;
  }

  /**
   * Get scheduled reports for a user
   */
  async getUserScheduledReports(userId: number): Promise<ScheduledReport[]> {
    return await scheduledReportRepository.findByUser(userId);
  }

  /**
   * Get all active scheduled reports
   */
  async getActiveScheduledReports(): Promise<ScheduledReport[]> {
    return await scheduledReportRepository.findActive();
  }

  /**
   * Get scheduled reports due for execution
   */
  async getDueReports(): Promise<ScheduledReport[]> {
    return await scheduledReportRepository.findDue();
  }

  /**
   * Update scheduled report
   */
  async updateScheduledReport(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      parameters: any;
      filters: any;
      frequency: ScheduleFrequency;
      scheduleTime: string;
      timezone: string;
      format: string;
      emailRecipients: string[];
      emailEnabled: boolean;
      locationIds: string[];
      isActive: boolean;
    }>
  ): Promise<ScheduledReport> {
    const updateData: Prisma.ScheduledReportUpdateInput = {};

    // Map the data to Prisma update input
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.parameters !== undefined) updateData.parameters = data.parameters;
    if (data.filters !== undefined) updateData.filters = data.filters;
    if (data.frequency !== undefined) updateData.frequency = data.frequency as any;
    if (data.scheduleTime !== undefined) updateData.scheduleTime = data.scheduleTime;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.format !== undefined) updateData.format = data.format.toUpperCase() as any;
    if (data.emailRecipients !== undefined) updateData.emailRecipients = data.emailRecipients;
    if (data.emailEnabled !== undefined) updateData.emailEnabled = data.emailEnabled;
    if (data.locationIds !== undefined) updateData.locationIds = data.locationIds;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Recalculate next run if schedule changed
    if (data.frequency || data.scheduleTime || data.timezone) {
      const current = await scheduledReportRepository.findById(id);
      if (current) {
        const nextRunAt = this.calculateNextRun(
          data.frequency || (current.frequency as ScheduleFrequency),
          data.scheduleTime || current.scheduleTime,
          current.startDate,
          data.timezone || current.timezone,
          current.lastRunAt || undefined
        );
        updateData.nextRunAt = nextRunAt;
      }
    }

    return await scheduledReportRepository.update(id, updateData);
  }

  /**
   * Delete scheduled report
   */
  async deleteScheduledReport(id: string): Promise<void> {
    await scheduledReportRepository.delete(id);
  }

  /**
   * Deactivate scheduled report
   */
  async deactivateScheduledReport(id: string): Promise<void> {
    await scheduledReportRepository.deactivate(id);
  }

  /**
   * Record successful execution
   */
  async recordSuccessfulExecution(
    id: string,
    executionId: string,
    outputUrl?: string,
    fileSize?: number,
    recordCount?: number,
    emailsSent?: number
  ): Promise<void> {
    const report = await scheduledReportRepository.findById(id);
    if (!report) return;

    // Calculate next run time
    const nextRunAt = this.calculateNextRun(
      report.frequency as ScheduleFrequency,
      report.scheduleTime,
      report.startDate,
      report.timezone,
      new Date()
    );

    // Update report status
    await scheduledReportRepository.recordSuccess(id, nextRunAt);

    // Update execution record
    await scheduledReportRepository.updateExecution(executionId, {
      completedAt: new Date(),
      duration: Math.floor((Date.now() - new Date(report.lastRunAt || new Date()).getTime()) / 1000),
      status: 'COMPLETED',
      outputUrl,
      fileSize,
      recordCount,
      emailsSent,
      emailStatus: emailsSent && emailsSent > 0 ? 'sent' : undefined
    });
  }

  /**
   * Record failed execution
   */
  async recordFailedExecution(id: string, executionId: string, error: string): Promise<void> {
    const report = await scheduledReportRepository.findById(id);
    if (!report) return;

    // Calculate next run time (retry after normal interval)
    const nextRunAt = this.calculateNextRun(
      report.frequency as ScheduleFrequency,
      report.scheduleTime,
      report.startDate,
      report.timezone,
      new Date()
    );

    // Update report status
    await scheduledReportRepository.recordFailure(id, error, nextRunAt);

    // Update execution record
    await scheduledReportRepository.updateExecution(executionId, {
      completedAt: new Date(),
      duration: Math.floor((Date.now() - new Date(report.lastRunAt || new Date()).getTime()) / 1000),
      status: 'FAILED',
      error
    });
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(scheduledReportId: string, limit: number = 10): Promise<any[]> {
    return await scheduledReportRepository.getExecutionHistory(scheduledReportId, limit);
  }

  /**
   * Start execution
   */
  async startExecution(scheduledReportId: string, configSnapshot: any): Promise<string> {
    const execution = await scheduledReportRepository.createExecution({
      scheduledReportId,
      configSnapshot,
      status: 'RUNNING',
      emailRecipients: configSnapshot.emailRecipients || []
    });

    return execution.id;
  }

  /**
   * Clean old execution records
   */
  async cleanOldExecutions(daysToKeep: number = 30): Promise<number> {
    return await scheduledReportRepository.cleanOldExecutions(daysToKeep);
  }
}

export const scheduledReportService = new ScheduledReportService();