import type { Transporter } from 'nodemailer';
import handlebars from 'handlebars';
import { emailConfigService } from './email-config.service';
import type { EmailMessage, EmailDeliveryStatus, EmailStatus } from '$lib/types/email';
import { renderEmailTemplate } from '$lib/types/email';

export class EmailService {
  private transporter: Transporter | null = null;
  private transporterClient: number | null = null;

  /**
   * Get or create email transporter
   */
  private async getTransporter(clientId?: number): Promise<Transporter> {
    // Check if we have a cached transporter for this client
    if (this.transporter && this.transporterClient === (clientId ?? null)) {
      return this.transporter;
    }

    // Get SMTP configuration
    const smtpConfig = await emailConfigService.getSMTPConfig(clientId);

    // Dynamic import for nodemailer to handle ES module issues
    const nodemailer = await import('nodemailer');
    this.transporter = nodemailer.createTransporter({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.auth?.user || smtpConfig.username,
        pass: smtpConfig.auth?.pass || smtpConfig.password
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates in development
      }
    });

    this.transporterClient = clientId ?? null;
    return this.transporter;
  }

  /**
   * Send email
   */
  async sendEmail(message: EmailMessage, clientId?: number): Promise<EmailDeliveryStatus> {
    try {
      const transporter = await this.getTransporter(clientId);
      const smtpConfig = await emailConfigService.getSMTPConfig(clientId);

      // Prepare email options
      const mailOptions = {
        from: smtpConfig.from || smtpConfig.auth?.user || 'noreply@solarforecast.com',
        to: message.to.join(', '),
        cc: message.cc?.join(', '),
        bcc: message.bcc?.join(', '),
        subject: message.subject,
        html: message.htmlBody,
        text: message.textBody,
        attachments: message.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          disposition: att.disposition,
          cid: att.contentId
        })),
        headers: message.headers
      };

      // Send email
      const info = await transporter.sendMail(mailOptions);

      return {
        messageId: info.messageId,
        status: 'DELIVERED' as EmailStatus,
        recipient: message.to.join(', '),
        timestamp: new Date().toISOString(),
        delivered: true
      };
    } catch (error: any) {
      console.error('Email sending failed:', error);

      return {
        messageId: '',
        status: 'FAILED' as EmailStatus,
        recipient: message.to.join(', '),
        timestamp: new Date().toISOString(),
        error: error.message,
        delivered: false
      };
    }
  }

  /**
   * Send report email
   */
  async sendReportEmail(
    recipients: string[],
    reportName: string,
    reportType: string,
    reportUrl: string,
    attachment?: Buffer,
    attachmentName?: string,
    format: string = 'PDF',
    clientId?: number
  ): Promise<EmailDeliveryStatus> {
    // Get template settings
    const templateSettings = await emailConfigService.getTemplateSettings(clientId);

    // Prepare template variables
    const variables = {
      reportName,
      reportType,
      generatedAt: new Date().toLocaleString(),
      format: format.toUpperCase(),
      reportUrl,
      recipientName: 'User',
      locationCount: '1',
      dateRange: 'Last 30 days',
      supportEmail: 'support@solarforecast.com',
      companyName: templateSettings.companyName || 'Solar Forecast Platform'
    };

    // Render email template
    const htmlTemplate = this.getReportEmailTemplate();
    const htmlBody = renderEmailTemplate(htmlTemplate, variables);

    const textTemplate = this.getReportEmailTextTemplate();
    const textBody = renderEmailTemplate(textTemplate, variables);

    // Prepare attachments
    const attachments = [];
    if (attachment && attachmentName) {
      attachments.push({
        filename: attachmentName,
        content: attachment,
        contentType: format === 'PDF'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        disposition: 'attachment' as const
      });
    }

    // Create email message
    const message: EmailMessage = {
      to: recipients,
      subject: renderEmailTemplate(templateSettings.reportTemplate?.subject || 'Solar Forecast Report - {{reportName}}', variables),
      htmlBody,
      textBody,
      attachments,
      tags: ['report', reportType],
      metadata: {
        reportName,
        reportType,
        format
      }
    };

    return await this.sendEmail(message, clientId);
  }

  /**
   * Send test email
   */
  async sendTestEmail(recipient: string, clientId?: number): Promise<EmailDeliveryStatus> {
    const message: EmailMessage = {
      to: [recipient],
      subject: 'Solar Forecast Platform - Test Email',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #003135 0%, #024950 100%); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #0FA4AF; margin: 0;">Test Email</h1>
          </div>
          <div style="background: #f8f9fa; padding: 20px;">
            <p style="color: #333;">This is a test email from the Solar Forecast Platform.</p>
            <p style="color: #333;">If you received this email, your email configuration is working correctly.</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Sent at: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `,
      textBody: `Test Email\n\nThis is a test email from the Solar Forecast Platform.\nIf you received this email, your email configuration is working correctly.\n\nSent at: ${new Date().toLocaleString()}`
    };

    return await this.sendEmail(message, clientId);
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(clientId?: number): Promise<boolean> {
    try {
      const transporter = await this.getTransporter(clientId);
      await transporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP verification failed:', error);
      return false;
    }
  }

  /**
   * Get report email HTML template
   */
  private getReportEmailTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{reportName}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #003135 0%, #024950 100%); padding: 30px;">
              <h1 style="color: #0FA4AF; margin: 0; font-size: 24px; font-weight: 600;">Solar Forecast Report</h1>
              <p style="color: #AFDDE5; margin: 10px 0 0 0; font-size: 14px;">{{companyName}}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; margin: 0 0 20px 0; font-size: 16px;">Dear {{recipientName}},</p>

              <p style="color: #333; margin: 0 0 20px 0; font-size: 14px; line-height: 1.6;">
                Your solar forecast report <strong>"{{reportName}}"</strong> has been generated successfully.
              </p>

              <!-- Report Details Box -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #0FA4AF; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #003135; margin: 0 0 15px 0; font-size: 16px;">Report Details:</h3>
                <table cellpadding="0" cellspacing="0" style="width: 100%;">
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px;">Type:</td>
                    <td style="padding: 5px 0 5px 20px; color: #333; font-size: 14px; font-weight: 500;">{{reportType}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px;">Generated:</td>
                    <td style="padding: 5px 0 5px 20px; color: #333; font-size: 14px; font-weight: 500;">{{generatedAt}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px;">Locations:</td>
                    <td style="padding: 5px 0 5px 20px; color: #333; font-size: 14px; font-weight: 500;">{{locationCount}} locations</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px;">Period:</td>
                    <td style="padding: 5px 0 5px 20px; color: #333; font-size: 14px; font-weight: 500;">{{dateRange}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px;">Format:</td>
                    <td style="padding: 5px 0 5px 20px; color: #333; font-size: 14px; font-weight: 500;">{{format}}</td>
                  </tr>
                </table>
              </div>

              <p style="color: #333; margin: 20px 0; font-size: 14px; line-height: 1.6;">
                The report is attached to this email in {{format}} format.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{reportUrl}}" style="display: inline-block; background-color: #0FA4AF; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 4px; font-size: 14px; font-weight: 600;">View Report Online</a>
              </div>

              <p style="color: #333; margin: 20px 0 0 0; font-size: 14px;">
                Best regards,<br>
                <strong style="color: #003135;">Solar Forecast Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; border-top: 1px solid #e9ecef;">
              <p style="color: #666; margin: 0; font-size: 12px; line-height: 1.6; text-align: center;">
                This is an automated message from the Solar Forecast Platform.<br>
                If you have any questions, please contact support at <a href="mailto:{{supportEmail}}" style="color: #0FA4AF; text-decoration: none;">{{supportEmail}}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Get report email text template
   */
  private getReportEmailTextTemplate(): string {
    return `Solar Forecast Report - {{reportName}}

Dear {{recipientName}},

Your solar forecast report "{{reportName}}" has been generated successfully.

Report Details:
- Type: {{reportType}}
- Generated: {{generatedAt}}
- Locations: {{locationCount}} locations
- Period: {{dateRange}}
- Format: {{format}}

The report is attached to this email in {{format}} format.

View online: {{reportUrl}}

Best regards,
Solar Forecast Team

---
This is an automated message from the Solar Forecast Platform.
If you have any questions, please contact support at {{supportEmail}}.`;
  }

  /**
   * Clear transporter cache
   */
  clearCache(): void {
    this.transporter = null;
    this.transporterClient = null;
  }
}

export const emailService = new EmailService();