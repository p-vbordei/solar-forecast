// Email configuration types matching Prisma schema

export interface EmailConfiguration {
  id: string;
  clientId?: number;            // Null for global configuration
  
  // Configuration details
  name: string;                 // "Default Recipients", "Emergency Contacts", etc.
  type: EmailConfigType;
  description?: string;
  
  // Email addresses
  recipients: string[];         // Array of email addresses
  
  // Service settings
  smtpSettings?: SMTPSettings;  // SMTP server configuration
  templateSettings?: EmailTemplateSettings; // Email template configuration
  
  // Status
  isActive: boolean;
  isValidated: boolean;
  
  // Usage tracking
  lastUsedAt?: Date | string;
  usageCount: number;
  
  // Metadata
  createdAt: Date | string;
  updatedAt: Date | string;
}

export enum EmailConfigType {
  RECIPIENTS = 'RECIPIENTS',    // Recipient lists
  SMTP = 'SMTP',               // SMTP configuration
  TEMPLATES = 'TEMPLATES',      // Email templates
  GLOBAL = 'GLOBAL'            // Global settings
}

export interface SMTPSettings {
  host: string;                 // SMTP server host
  port: number;                 // SMTP server port
  secure: boolean;              // Use SSL/TLS
  username: string;             // SMTP username
  password?: string;            // SMTP password (encrypted)
  fromEmail: string;            // From email address
  fromName: string;             // From display name
  replyTo?: string;             // Reply-to address
  
  // Advanced settings
  connectionTimeout?: number;   // Connection timeout in ms
  socketTimeout?: number;       // Socket timeout in ms
  maxConnections?: number;      // Max concurrent connections
  rateDelta?: number;           // Rate limiting delta
  rateLimit?: number;           // Rate limiting max messages
}

export interface EmailTemplateSettings {
  // Report email templates
  reportTemplate?: EmailTemplate;
  alertTemplate?: EmailTemplate;
  forecastTemplate?: EmailTemplate;
  maintenanceTemplate?: EmailTemplate;
  
  // Common settings
  logoUrl?: string;
  companyName?: string;
  brandColors?: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
  };
  
  // Footer settings
  footerText?: string;
  unsubscribeUrl?: string;
  contactInfo?: {
    email: string;
    phone?: string;
    address?: string;
  };
}

export interface EmailTemplate {
  subject: string;
  htmlTemplate: string;        // HTML template with placeholders
  textTemplate: string;        // Plain text template
  variables: string[];         // Available template variables
  
  // Styling
  styles?: {
    headerColor?: string;
    buttonColor?: string;
    textColor?: string;
    backgroundColor?: string;
  };
}

// Email service interfaces
export interface EmailServiceConfig {
  provider: EmailProvider;
  apiKey?: string;             // For API-based services
  smtpSettings?: SMTPSettings; // For SMTP
  
  // Service-specific settings
  domain?: string;             // For services like Mailgun
  region?: string;             // For services like SES
  webhook?: string;            // Webhook URL for delivery tracking
}

export enum EmailProvider {
  SMTP = 'SMTP',
  SENDGRID = 'SENDGRID',
  MAILGUN = 'MAILGUN',
  SES = 'SES',
  ZOHO = 'ZOHO',
  GMAIL = 'GMAIL'
}

// Email sending interfaces
export interface EmailMessage {
  to: string[];                // Recipient email addresses
  cc?: string[];               // CC recipients
  bcc?: string[];              // BCC recipients
  subject: string;
  htmlBody: string;            // HTML email body
  textBody: string;            // Plain text body
  
  // Attachments
  attachments?: EmailAttachment[];
  
  // Headers
  headers?: Record<string, string>;
  
  // Tracking
  trackOpens?: boolean;
  trackClicks?: boolean;
  
  // Metadata
  tags?: string[];             // For categorization
  metadata?: Record<string, any>; // Custom metadata
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;    // File content
  contentType: string;         // MIME type
  disposition?: 'attachment' | 'inline';
  contentId?: string;          // For inline images
}

// Email delivery tracking
export interface EmailDeliveryStatus {
  messageId: string;
  status: EmailStatus;
  recipient: string;
  timestamp: Date | string;
  error?: string;
  
  // Delivery tracking
  delivered?: boolean;
  opened?: boolean;
  clicked?: boolean;
  bounced?: boolean;
  complained?: boolean;
}

export enum EmailStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
  BOUNCED = 'BOUNCED',
  COMPLAINED = 'COMPLAINED',
  FAILED = 'FAILED'
}

// Request/Response interfaces for API
export interface EmailConfigurationRequest {
  name: string;
  type: EmailConfigType;
  recipients?: string[];
  smtpSettings?: SMTPSettings;
  templateSettings?: EmailTemplateSettings;
  description?: string;
}

export interface EmailConfigurationResponse {
  success: boolean;
  data?: EmailConfiguration;
  error?: string;
}

export interface EmailSendRequest {
  configId?: string;           // Use specific email configuration
  to: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  attachments?: EmailAttachment[];
  templateId?: string;         // Use email template
  templateVariables?: Record<string, any>; // Template variable values
}

export interface EmailSendResponse {
  success: boolean;
  data?: {
    messageId: string;
    status: EmailStatus;
    recipients: string[];
  };
  error?: string;
}

// Template rendering functions
export function renderEmailTemplate(template: string, variables: Record<string, any>): string {
  let rendered = template;
  
  // Replace template variables like {{variable}}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, String(value || ''));
  });
  
  return rendered;
}

// Email validation utilities
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateEmailList(emails: string[]): { valid: string[], invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  emails.forEach(email => {
    const trimmed = email.trim();
    if (validateEmail(trimmed)) {
      valid.push(trimmed);
    } else {
      invalid.push(trimmed);
    }
  });
  
  return { valid, invalid };
}

// Default email templates
export const DEFAULT_TEMPLATES = {
  report: {
    subject: 'Solar Forecast Report - {{reportName}}',
    htmlTemplate: `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0FA4AF;">Solar Forecast Report</h2>
            <p>Dear {{recipientName}},</p>
            <p>Your solar forecast report "{{reportName}}" has been generated successfully.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Report Details:</h3>
              <ul>
                <li><strong>Type:</strong> {{reportType}}</li>
                <li><strong>Generated:</strong> {{generatedAt}}</li>
                <li><strong>Locations:</strong> {{locationCount}} locations</li>
                <li><strong>Period:</strong> {{dateRange}}</li>
              </ul>
            </div>
            
            <p>The report is attached to this email in {{format}} format.</p>
            
            <div style="margin: 30px 0;">
              <a href="{{reportUrl}}" style="background-color: #0FA4AF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Report Online</a>
            </div>
            
            <p>Best regards,<br>Solar Forecast Team</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
              This is an automated message from the Solar Forecast Platform. 
              If you have any questions, please contact support at {{supportEmail}}.
            </p>
          </div>
        </body>
      </html>
    `,
    textTemplate: `
Solar Forecast Report - {{reportName}}

Dear {{recipientName}},

Your solar forecast report "{{reportName}}" has been generated successfully.

Report Details:
- Type: {{reportType}}
- Generated: {{generatedAt}}
- Locations: {{locationCount}} locations
- Period: {{dateRange}}

The report is attached to this email in {{format}} format.

View online: {{reportUrl}}

Best regards,
Solar Forecast Team

---
This is an automated message from the Solar Forecast Platform.
If you have any questions, please contact support at {{supportEmail}}.
    `,
    variables: ['recipientName', 'reportName', 'reportType', 'generatedAt', 'locationCount', 'dateRange', 'format', 'reportUrl', 'supportEmail']
  }
};

// SMTP test configuration
export interface SMTPTestRequest {
  smtpSettings: SMTPSettings;
  testEmail: string;
}

export interface SMTPTestResponse {
  success: boolean;
  message: string;
  error?: string;
  details?: {
    connectionTime?: number;
    authenticationPassed?: boolean;
    messageSent?: boolean;
  };
}