import { db } from '../database';
import type { EmailConfiguration, EmailConfigType } from '$lib/types/email';
import type { Prisma } from '@prisma/client';

export class EmailConfigRepository {
  /**
   * Get email configuration by ID
   */
  async findById(id: string): Promise<EmailConfiguration | null> {
    return await db.emailConfiguration.findUnique({
      where: { id },
      include: {
        client: true
      }
    });
  }

  /**
   * Get email configuration by client
   */
  async findByClient(clientId: number | null): Promise<EmailConfiguration[]> {
    return await db.emailConfiguration.findMany({
      where: {
        clientId,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Get active email configurations
   */
  async findActive(clientId?: number): Promise<EmailConfiguration[]> {
    const where: Prisma.EmailConfigurationWhereInput = {
      isActive: true
    };

    if (clientId !== undefined) {
      where.clientId = clientId;
    }

    return await db.emailConfiguration.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Get email configuration by type
   */
  async findByType(type: EmailConfigType, clientId?: number): Promise<EmailConfiguration | null> {
    return await db.emailConfiguration.findFirst({
      where: {
        type,
        clientId: clientId ?? null,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Create email configuration
   */
  async create(data: Prisma.EmailConfigurationCreateInput): Promise<EmailConfiguration> {
    return await db.emailConfiguration.create({
      data
    });
  }

  /**
   * Update email configuration
   */
  async update(id: string, data: Prisma.EmailConfigurationUpdateInput): Promise<EmailConfiguration> {
    // Update usage tracking
    const updateData: Prisma.EmailConfigurationUpdateInput = {
      ...data,
      updatedAt: new Date()
    };

    return await db.emailConfiguration.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Update last used timestamp and increment usage count
   */
  async recordUsage(id: string): Promise<void> {
    await db.emailConfiguration.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
        usageCount: {
          increment: 1
        }
      }
    });
  }

  /**
   * Delete email configuration
   */
  async delete(id: string): Promise<void> {
    await db.emailConfiguration.delete({
      where: { id }
    });
  }

  /**
   * Soft delete by deactivating
   */
  async deactivate(id: string): Promise<EmailConfiguration> {
    return await db.emailConfiguration.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Validate email configuration
   */
  async markValidated(id: string, isValidated: boolean): Promise<EmailConfiguration> {
    return await db.emailConfiguration.update({
      where: { id },
      data: {
        isValidated,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get or create default configuration
   */
  async getOrCreateDefault(clientId: number | null): Promise<EmailConfiguration> {
    const existing = await this.findByType('RECIPIENTS' as EmailConfigType, clientId ?? undefined);

    if (existing) {
      return existing;
    }

    // Create default configuration
    return await this.create({
      name: 'Default Recipients',
      type: 'RECIPIENTS',
      recipients: [],
      isActive: true,
      isValidated: false,
      description: 'Default email recipient list for reports',
      clientId
    });
  }

  /**
   * Bulk update recipients
   */
  async updateRecipients(id: string, recipients: string[]): Promise<EmailConfiguration> {
    return await db.emailConfiguration.update({
      where: { id },
      data: {
        recipients,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get SMTP configuration
   */
  async getSMTPConfig(clientId?: number): Promise<EmailConfiguration | null> {
    return await db.emailConfiguration.findFirst({
      where: {
        type: 'SMTP',
        clientId: clientId ?? null,
        isActive: true,
        isValidated: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}

export const emailConfigRepository = new EmailConfigRepository();