import { json, type RequestHandler } from '@sveltejs/kit';
import { emailConfigService } from '$lib/server/services/email-config.service';

/**
 * GET /api/reports/email-config
 * Get email configuration
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    // For now, using hardcoded user ID until auth is implemented
    const userId = 1;
    const clientId = undefined; // Will be derived from user's client when auth is ready

    const configuration = await emailConfigService.getConfiguration(clientId);

    return json({
      success: true,
      data: {
        id: configuration.id,
        name: configuration.name,
        emails: configuration.recipients || [],
        smtpConfigured: !!configuration.smtpSettings,
        isValidated: configuration.isValidated,
        lastUsedAt: configuration.lastUsedAt
      }
    });
  } catch (error: any) {
    console.error('Error fetching email configuration:', error);
    return json(
      { success: false, error: error.message || 'Failed to fetch email configuration' },
      { status: 500 }
    );
  }
};

/**
 * POST /api/reports/email-config
 * Update email configuration
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { emails } = data;

    // For now, using hardcoded user ID until auth is implemented
    const userId = 1;
    const clientId = undefined; // Will be derived from user's client when auth is ready

    // Validate input
    if (!emails || !Array.isArray(emails)) {
      return json(
        { success: false, error: 'Invalid request: emails must be an array' },
        { status: 400 }
      );
    }

    // Update email recipients
    const configuration = await emailConfigService.updateRecipients(emails, clientId);

    return json({
      success: true,
      data: {
        id: configuration.id,
        name: configuration.name,
        emails: configuration.recipients || [],
        updatedAt: configuration.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Error updating email configuration:', error);
    return json(
      { success: false, error: error.message || 'Failed to update email configuration' },
      { status: 500 }
    );
  }
};