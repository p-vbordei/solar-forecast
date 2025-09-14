import { db } from '../database';
import type { Prisma } from '@prisma/client';
import type { ScheduledReport } from '$lib/types/report';

export class ScheduledReportRepository {
  /**
   * Create a scheduled report
   */
  async create(data: Prisma.ScheduledReportCreateInput): Promise<ScheduledReport> {
    return await db.scheduledReport.create({
      data,
      include: {
        user: true,
        executions: {
          take: 5,
          orderBy: {
            startedAt: 'desc'
          }
        }
      }
    });
  }

  /**
   * Get scheduled report by ID
   */
  async findById(id: string): Promise<ScheduledReport | null> {
    return await db.scheduledReport.findUnique({
      where: { id },
      include: {
        user: true,
        executions: {
          take: 5,
          orderBy: {
            startedAt: 'desc'
          }
        }
      }
    });
  }

  /**
   * Get all scheduled reports for a user
   */
  async findByUser(userId: number): Promise<ScheduledReport[]> {
    return await db.scheduledReport.findMany({
      where: { userId },
      include: {
        user: true,
        executions: {
          take: 1,
          orderBy: {
            startedAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Get active scheduled reports
   */
  async findActive(): Promise<ScheduledReport[]> {
    return await db.scheduledReport.findMany({
      where: {
        isActive: true
      },
      include: {
        user: true
      },
      orderBy: {
        nextRunAt: 'asc'
      }
    });
  }

  /**
   * Get scheduled reports due for execution
   */
  async findDue(): Promise<ScheduledReport[]> {
    const now = new Date();

    return await db.scheduledReport.findMany({
      where: {
        isActive: true,
        nextRunAt: {
          lte: now
        }
      },
      include: {
        user: true
      }
    });
  }

  /**
   * Update scheduled report
   */
  async update(id: string, data: Prisma.ScheduledReportUpdateInput): Promise<ScheduledReport> {
    return await db.scheduledReport.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        user: true,
        executions: {
          take: 5,
          orderBy: {
            startedAt: 'desc'
          }
        }
      }
    });
  }

  /**
   * Update next run time
   */
  async updateNextRun(id: string, nextRunAt: Date): Promise<void> {
    await db.scheduledReport.update({
      where: { id },
      data: {
        nextRunAt,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Record successful execution
   */
  async recordSuccess(id: string, nextRunAt: Date): Promise<void> {
    await db.scheduledReport.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        nextRunAt,
        lastStatus: 'COMPLETED',
        errorCount: 0,
        lastError: null,
        totalRuns: {
          increment: 1
        },
        successfulRuns: {
          increment: 1
        },
        updatedAt: new Date()
      }
    });
  }

  /**
   * Record failed execution
   */
  async recordFailure(id: string, error: string, nextRunAt?: Date): Promise<void> {
    await db.scheduledReport.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        lastStatus: 'FAILED',
        lastError: error,
        errorCount: {
          increment: 1
        },
        totalRuns: {
          increment: 1
        },
        ...(nextRunAt && { nextRunAt }),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Deactivate scheduled report
   */
  async deactivate(id: string): Promise<void> {
    await db.scheduledReport.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Delete scheduled report
   */
  async delete(id: string): Promise<void> {
    // Delete executions first
    await db.scheduledReportExecution.deleteMany({
      where: { scheduledReportId: id }
    });

    // Delete the scheduled report
    await db.scheduledReport.delete({
      where: { id }
    });
  }

  /**
   * Create execution record
   */
  async createExecution(data: Prisma.ScheduledReportExecutionCreateInput): Promise<any> {
    return await db.scheduledReportExecution.create({
      data
    });
  }

  /**
   * Update execution record
   */
  async updateExecution(id: string, data: Prisma.ScheduledReportExecutionUpdateInput): Promise<any> {
    return await db.scheduledReportExecution.update({
      where: { id },
      data
    });
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(scheduledReportId: string, limit: number = 10): Promise<any[]> {
    return await db.scheduledReportExecution.findMany({
      where: { scheduledReportId },
      orderBy: {
        startedAt: 'desc'
      },
      take: limit
    });
  }

  /**
   * Clean old execution records
   */
  async cleanOldExecutions(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db.scheduledReportExecution.deleteMany({
      where: {
        startedAt: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }
}

export const scheduledReportRepository = new ScheduledReportRepository();