import { json, type RequestHandler } from '@sveltejs/kit';
import { emailService } from '$lib/server/services/email.service';
import { emailConfigService } from '$lib/server/services/email-config.service';
import type { EmailMessage } from '$lib/types/email';

/**
 * POST /api/test/email
 * Test email service with various scenarios
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { testType = 'basic', recipient = 'bordeivlad@gmail.com' } = data;

    console.log(`[EmailTest] Testing email service - Type: ${testType}, Recipient: ${recipient}`);

    let results: any = {};

    // Test 1: SMTP Connection Verification
    if (testType === 'connection' || testType === 'all') {
      console.log('[EmailTest] Testing SMTP connection...');
      const connectionTest = await emailService.verifyConnection();
      results.connection = {
        success: connectionTest,
        message: connectionTest ? 'SMTP connection successful' : 'SMTP connection failed'
      };
    }

    // Test 2: Send Basic Test Email
    if (testType === 'basic' || testType === 'all') {
      console.log('[EmailTest] Sending basic test email...');
      const basicTest = await emailService.sendTestEmail(recipient);
      results.basicEmail = {
        success: basicTest.delivered,
        messageId: basicTest.messageId,
        status: basicTest.status,
        message: basicTest.delivered ? 'Basic test email sent successfully' : `Failed: ${basicTest.error}`,
        recipient: basicTest.recipient
      };
    }

    // Test 3: Send Report Email with Attachment
    if (testType === 'report' || testType === 'all') {
      console.log('[EmailTest] Sending report test email...');

      // Create sample report data (mock PDF buffer)
      const sampleReportBuffer = Buffer.from('Sample PDF report content - this would be actual PDF data');

      const reportTest = await emailService.sendReportEmail(
        [recipient],
        'Test Production Report',
        'Production Summary',
        'https://localhost:5173/reports',
        sampleReportBuffer,
        'production_report_test.pdf',
        'PDF'
      );

      results.reportEmail = {
        success: reportTest.delivered,
        messageId: reportTest.messageId,
        status: reportTest.status,
        message: reportTest.delivered ? 'Report email sent successfully' : `Failed: ${reportTest.error}`,
        recipient: reportTest.recipient
      };
    }

    // Test 4: Custom Email Template Test
    if (testType === 'template' || testType === 'all') {
      console.log('[EmailTest] Sending custom template test email...');

      const customMessage: EmailMessage = {
        to: [recipient],
        subject: 'Solar Forecast Platform - Configuration Test',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
            <div style="background: linear-gradient(135deg, #003135 0%, #024950 100%); padding: 30px; border-radius: 8px; color: white;">
              <h1 style="color: #0FA4AF; margin: 0; font-size: 24px;">✅ Email Configuration Test Successful!</h1>
              <p style="color: #AFDDE5; margin: 10px 0 0 0;">Solar Forecast Platform Email Service</p>
            </div>

            <div style="background: white; padding: 30px; border-radius: 8px; margin-top: 10px;">
              <h2 style="color: #003135; margin: 0 0 20px 0;">Configuration Details</h2>

              <div style="background: #f8f9fa; border-left: 4px solid #0FA4AF; padding: 15px; margin: 15px 0;">
                <strong style="color: #003135;">SMTP Server:</strong> smtp.zoho.eu:587<br>
                <strong style="color: #003135;">From Address:</strong> solarforecastingservices@vollko.com<br>
                <strong style="color: #003135;">Test Time:</strong> ${new Date().toLocaleString()}<br>
                <strong style="color: #003135;">Test Type:</strong> Template Test
              </div>

              <p style="color: #333; margin: 15px 0;">
                This test confirms that:
              </p>
              <ul style="color: #333; padding-left: 20px;">
                <li>✅ SMTP configuration is working correctly</li>
                <li>✅ HTML email templates render properly</li>
                <li>✅ Zoho SMTP service is accessible</li>
                <li>✅ Email routing is functional</li>
              </ul>

              <div style="background: #e8f5e8; border: 1px solid #0FA4AF; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="color: #003135; margin: 0;">
                  🎉 <strong>Congratulations!</strong> Your Solar Forecast Platform email service is fully configured and ready for scheduled reports.
                </p>
              </div>

              <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
                This is an automated test message from the Solar Forecast Platform.<br>
                Generated at: ${new Date().toISOString()}
              </p>
            </div>
          </div>
        `,
        textBody: `
Solar Forecast Platform - Configuration Test

✅ EMAIL CONFIGURATION TEST SUCCESSFUL!

Configuration Details:
- SMTP Server: smtp.zoho.eu:587
- From Address: solarforecastingservices@vollko.com
- Test Time: ${new Date().toLocaleString()}
- Test Type: Template Test

This test confirms that:
✅ SMTP configuration is working correctly
✅ HTML email templates render properly
✅ Zoho SMTP service is accessible
✅ Email routing is functional

🎉 Congratulations! Your Solar Forecast Platform email service is fully configured and ready for scheduled reports.

---
This is an automated test message from the Solar Forecast Platform.
Generated at: ${new Date().toISOString()}
        `,
        tags: ['test', 'configuration']
      };

      const templateTest = await emailService.sendEmail(customMessage);
      results.templateEmail = {
        success: templateTest.delivered,
        messageId: templateTest.messageId,
        status: templateTest.status,
        message: templateTest.delivered ? 'Template email sent successfully' : `Failed: ${templateTest.error}`,
        recipient: templateTest.recipient
      };
    }

    // Test 5: Email Configuration Status
    if (testType === 'config' || testType === 'all') {
      console.log('[EmailTest] Checking email configuration...');
      try {
        const config = await emailConfigService.getConfiguration();
        const smtpConfig = await emailConfigService.getSMTPConfig();

        results.configuration = {
          success: true,
          config: {
            id: config.id,
            name: config.name,
            recipients: config.recipients,
            smtpHost: smtpConfig.host,
            smtpPort: smtpConfig.port,
            smtpUser: smtpConfig.auth?.user,
            fromAddress: smtpConfig.from,
            isValidated: config.isValidated
          },
          message: 'Configuration retrieved successfully'
        };
      } catch (error: any) {
        results.configuration = {
          success: false,
          error: error.message,
          message: 'Failed to retrieve configuration'
        };
      }
    }

    console.log(`[EmailTest] Test completed - Results:`, results);

    return json({
      success: true,
      data: {
        testType,
        timestamp: new Date().toISOString(),
        results,
        summary: {
          testsRun: Object.keys(results).length,
          successful: Object.values(results).filter((r: any) => r.success).length,
          failed: Object.values(results).filter((r: any) => !r.success).length
        }
      }
    });

  } catch (error: any) {
    console.error('[EmailTest] Test failed:', error);
    return json(
      {
        success: false,
        error: error.message || 'Email test failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};

/**
 * GET /api/test/email
 * Get email service status and configuration
 */
export const GET: RequestHandler = async () => {
  try {
    const config = await emailConfigService.getConfiguration();
    const smtpConfig = await emailConfigService.getSMTPConfig();
    const connectionTest = await emailService.verifyConnection();

    return json({
      success: true,
      data: {
        status: 'Email service is configured',
        connection: connectionTest ? 'Connected' : 'Connection Failed',
        configuration: {
          smtpHost: smtpConfig.host,
          smtpPort: smtpConfig.port,
          fromAddress: smtpConfig.from,
          hasRecipients: (config.recipients?.length || 0) > 0,
          recipientCount: config.recipients?.length || 0,
          isValidated: config.isValidated
        },
        testEndpoints: {
          connection: 'POST /api/test/email { "testType": "connection" }',
          basic: 'POST /api/test/email { "testType": "basic", "recipient": "email@domain.com" }',
          report: 'POST /api/test/email { "testType": "report", "recipient": "email@domain.com" }',
          template: 'POST /api/test/email { "testType": "template", "recipient": "email@domain.com" }',
          all: 'POST /api/test/email { "testType": "all", "recipient": "email@domain.com" }'
        }
      }
    });
  } catch (error: any) {
    return json(
      {
        success: false,
        error: error.message || 'Failed to get email service status'
      },
      { status: 500 }
    );
  }
};