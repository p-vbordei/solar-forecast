import { emailConfigRepository } from '../repositories/email-config.repository';
import type { EmailConfiguration, EmailConfigType } from '$lib/types/email';
import { validateEmailList } from '$lib/types/email';

export class EmailConfigService {
  /**
   * Get email configuration for a client
   */
  async getConfiguration(clientId?: number): Promise<EmailConfiguration> {
    // Try to get existing configuration
    const configs = await emailConfigRepository.findActive(clientId);

    if (configs.length > 0) {
      return configs[0];
    }

    // Create default configuration if none exists
    return await emailConfigRepository.getOrCreateDefault(clientId ?? null);
  }

  /**
   * Get email recipients
   */
  async getRecipients(clientId?: number): Promise<string[]> {
    const config = await this.getConfiguration(clientId);
    return config.recipients || [];
  }

  /**
   * Update email recipients
   */
  async updateRecipients(emails: string[], clientId?: number): Promise<EmailConfiguration> {
    // Validate emails
    const { valid, invalid } = validateEmailList(emails);

    if (invalid.length > 0) {
      throw new Error(`Invalid email addresses: ${invalid.join(', ')}`);
    }

    // Get or create configuration
    const config = await this.getConfiguration(clientId);

    // Update recipients
    return await emailConfigRepository.updateRecipients(config.id, valid);
  }

  /**
   * Get SMTP configuration
   */
  async getSMTPConfig(clientId?: number): Promise<any> {
    const config = await emailConfigRepository.getSMTPConfig(clientId);

    if (!config || !config.smtpSettings) {
      // Return default SMTP settings from environment
      return {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        },
        from: process.env.SMTP_FROM || 'noreply@solarforecast.com'
      };
    }

    return config.smtpSettings;
  }

  /**
   * Update SMTP configuration
   */
  async updateSMTPConfig(smtpSettings: any, clientId?: number): Promise<EmailConfiguration> {
    // Find existing SMTP config or create new one
    let config = await emailConfigRepository.findByType('SMTP' as EmailConfigType, clientId);

    if (config) {
      return await emailConfigRepository.update(config.id, {
        smtpSettings,
        isValidated: false // Reset validation when settings change
      });
    } else {
      return await emailConfigRepository.create({
        name: 'SMTP Configuration',
        type: 'SMTP',
        recipients: [],
        smtpSettings,
        isActive: true,
        isValidated: false,
        description: 'SMTP server configuration for sending emails',
        clientId: clientId ?? null
      });
    }
  }

  /**
   * Test SMTP configuration
   */
  async testSMTPConfig(smtpSettings: any): Promise<{ success: boolean; message: string }> {
    try {
      // Dynamic import to avoid loading nodemailer unless needed
      const nodemailer = await import('nodemailer');

      // Create transporter with provided settings
      const transporter = nodemailer.createTransporter({
        host: smtpSettings.host,
        port: smtpSettings.port,
        secure: smtpSettings.secure,
        auth: {
          user: smtpSettings.auth?.user || smtpSettings.username,
          pass: smtpSettings.auth?.pass || smtpSettings.password
        }
      });

      // Verify connection
      await transporter.verify();

      return {
        success: true,
        message: 'SMTP configuration is valid'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `SMTP test failed: ${error.message}`
      };
    }
  }

  /**
   * Mark configuration as validated
   */
  async markValidated(id: string, isValidated: boolean): Promise<EmailConfiguration> {
    return await emailConfigRepository.markValidated(id, isValidated);
  }

  /**
   * Get all configurations for a client
   */
  async getAllConfigurations(clientId?: number): Promise<EmailConfiguration[]> {
    return await emailConfigRepository.findActive(clientId);
  }

  /**
   * Delete configuration
   */
  async deleteConfiguration(id: string): Promise<void> {
    await emailConfigRepository.deactivate(id);
  }

  /**
   * Get email template settings
   */
  async getTemplateSettings(clientId?: number): Promise<any> {
    const config = await emailConfigRepository.findByType('TEMPLATES' as EmailConfigType, clientId);

    if (!config || !config.templateSettings) {
      // Return default template settings
      return {
        reportTemplate: {
          subject: 'Solar Forecast Report - {{reportName}}',
          variables: ['reportName', 'reportType', 'dateRange', 'locationCount']
        },
        brandColors: {
          primary: '#0FA4AF',
          secondary: '#024950',
          text: '#AFDDE5',
          background: '#003135'
        },
        companyName: 'Solar Forecast Platform',
        footerText: 'This is an automated message from the Solar Forecast Platform.'
      };
    }

    return config.templateSettings;
  }

  /**
   * Record usage of configuration
   */
  async recordUsage(id: string): Promise<void> {
    await emailConfigRepository.recordUsage(id);
  }
}

export const emailConfigService = new EmailConfigService();