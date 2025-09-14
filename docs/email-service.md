# Email Service & Scheduled Reports Documentation

## Overview

The Solar Forecast Platform includes a comprehensive email service and report scheduling system that allows users to:
- Schedule automated report generation and distribution
- Configure email recipients and SMTP settings
- Send reports via email in various formats (PDF, Excel, CSV)
- Track execution history and delivery status

## Architecture

The email service follows the CSR (Controller/Service/Repository) pattern:

```
API Endpoints (Controllers)
    ↓
Services (Business Logic)
    ↓
Repositories (Data Access)
    ↓
Prisma ORM → TimescaleDB
```

## Components

### 1. Email Configuration Service
**Location**: `src/lib/server/services/email-config.service.ts`

Manages email settings including:
- Recipient lists
- SMTP server configuration
- Email templates
- Multi-tenant support (per client)

### 2. Scheduled Report Service
**Location**: `src/lib/server/services/scheduled-report.service.ts`

Handles report scheduling:
- CRUD operations for scheduled reports
- Next run time calculation
- Frequency management (daily, weekly, monthly, quarterly)
- Timezone-aware scheduling

### 3. Email Service
**Location**: `src/lib/server/services/email.service.ts`

Core email functionality:
- Multi-provider support (SMTP, SendGrid, Mailgun)
- HTML email templates with Solar Forecast branding
- Attachment handling for reports
- Delivery tracking

### 4. Scheduler Service
**Location**: `src/lib/server/services/scheduler.service.ts`

Background job execution:
- Cron-based scheduling engine
- Automatic report execution
- Error handling and retry logic
- Performance monitoring

### 5. Report Execution Service
**Location**: `src/lib/server/services/report-execution.service.ts`

Integrates scheduling with report generation:
- Executes scheduled reports
- Generates report files (Excel/PDF)
- Sends reports via email
- Records execution history

## API Endpoints

### Email Configuration

#### GET /api/reports/email-config
Get current email configuration
```bash
curl -X GET http://localhost:5173/api/reports/email-config
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Default Recipients",
    "emails": ["test@example.com"],
    "smtpConfigured": true,
    "isValidated": true
  }
}
```

#### POST /api/reports/email-config
Update email recipients
```bash
curl -X POST http://localhost:5173/api/reports/email-config \
  -H "Content-Type: application/json" \
  -d '{"emails": ["report@example.com", "admin@example.com"]}'
```

### Scheduled Reports

#### POST /api/reports/schedule
Create a scheduled report
```bash
curl -X POST http://localhost:5173/api/reports/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "production-summary",
    "frequency": "daily",
    "time": "09:00",
    "startDate": "2025-09-14",
    "format": "excel",
    "aggregation": "1h",
    "timezone": "UTC",
    "locationIds": ["loc-001"],
    "emails": ["test@example.com"],
    "scheduleDescription": "Daily production summary"
  }'
```

#### GET /api/reports/scheduled
Get list of scheduled reports
```bash
curl -X GET http://localhost:5173/api/reports/scheduled
```

#### DELETE /api/reports/scheduled/[id]
Delete a scheduled report
```bash
curl -X DELETE http://localhost:5173/api/reports/scheduled/{report-id}
```

### Scheduler Control

#### POST /api/scheduler/start
Start the scheduler service
```bash
curl -X POST http://localhost:5173/api/scheduler/start
```

#### GET /api/scheduler/start
Get scheduler status
```bash
curl -X GET http://localhost:5173/api/scheduler/start
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@solarforecast.com"

# Scheduler
START_SCHEDULER="false"  # Set to true in production
```

### SMTP Providers

#### Gmail
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
```

#### SendGrid
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
```

#### Mailgun
```env
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_SECURE="false"
```

## Database Schema

### ScheduledReport Model
```prisma
model ScheduledReport {
  id                String    @id @default(uuid())
  userId            Int
  reportType        ReportType
  name              String
  parameters        Json
  frequency         ScheduleFrequency
  scheduleTime      String
  startDate         DateTime
  timezone          String
  format            ReportFormat
  emailRecipients   String[]
  locationIds       String[]
  isActive          Boolean
  nextRunAt         DateTime?
  lastRunAt         DateTime?
}
```

### EmailConfiguration Model
```prisma
model EmailConfiguration {
  id                String    @id @default(uuid())
  clientId          Int?
  name              String
  type              EmailConfigType
  recipients        String[]
  smtpSettings      Json?
  isActive          Boolean
  isValidated       Boolean
}
```

## Email Templates

The system uses branded HTML email templates with Solar Forecast colors:
- Dark Petrol: #003135
- Teal Dark: #024950
- Cyan: #0FA4AF
- Soft Blue: #AFDDE5

Templates are located in the email service and can be customized per client.

## Usage Examples

### 1. Setup Email Recipients

```javascript
// Frontend code
const response = await fetch('/api/reports/email-config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emails: ['manager@company.com', 'analyst@company.com']
  })
});
```

### 2. Schedule a Daily Report

```javascript
const response = await fetch('/api/reports/schedule', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reportType: 'production-summary',
    frequency: 'daily',
    time: '06:00',
    startDate: new Date().toISOString().split('T')[0],
    format: 'excel',
    aggregation: '1h',
    timezone: 'Europe/Berlin',
    locationIds: ['loc-001', 'loc-002'],
    emails: ['report@company.com']
  })
});
```

### 3. View Scheduled Reports

```javascript
const response = await fetch('/api/reports/scheduled');
const { data } = await response.json();

data.forEach(report => {
  console.log(`${report.name}: Next run at ${report.nextRunAt}`);
});
```

## Monitoring

### Health Check
The scheduler service integrates with the existing health monitoring:
```bash
curl http://localhost:5173/api/timescale/health
```

### Execution History
Track report execution history through the database:
```sql
SELECT * FROM scheduled_report_executions
WHERE scheduled_report_id = 'report-id'
ORDER BY started_at DESC;
```

### Email Delivery Tracking
Monitor email delivery status:
- Successful deliveries
- Failed attempts
- Retry counts
- Error messages

## Troubleshooting

### Common Issues

#### 1. SMTP Connection Failed
- Verify SMTP credentials in `.env`
- Check firewall rules for SMTP ports
- For Gmail, enable "Less secure app access" or use App Password

#### 2. Reports Not Executing
- Check scheduler is running: `GET /api/scheduler/start`
- Verify `nextRunAt` times in database
- Check execution logs for errors

#### 3. Emails Not Sending
- Verify recipient email addresses are valid
- Check SMTP configuration is validated
- Review email service logs

#### 4. Timezone Issues
- Ensure timezone is correctly set in schedule configuration
- Database stores times in UTC
- Frontend displays in local timezone

## Production Deployment

### Railway Configuration

1. Set environment variables in Railway dashboard
2. Enable scheduler in production:
   ```env
   START_SCHEDULER=true
   ```
3. Configure SMTP with production email service
4. Set up monitoring and alerts

### Performance Optimization

- Email queue processing for high volume
- Report generation caching
- TimescaleDB query optimization
- Background job parallelization

## Security Considerations

- SMTP passwords encrypted in database
- Rate limiting on email sending
- Input validation for email addresses
- Audit logging for all operations
- Multi-tenant data isolation

## Future Enhancements

- [ ] Email delivery webhooks
- [ ] Custom email templates per report type
- [ ] Report preview before scheduling
- [ ] Bulk email operations
- [ ] Email bounce handling
- [ ] Advanced scheduling (holidays, business days)
- [ ] Report compression for large files
- [ ] Email tracking pixels