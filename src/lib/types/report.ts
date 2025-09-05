// Report types matching updated Prisma schema and UI requirements

export interface Report {
  id: string;
  userId: number;
  
  // Report details
  type: ReportType;
  name: string;
  description?: string;
  
  // Configuration
  parameters: any;              // Report configuration
  filters?: any;                // Location IDs, date ranges, etc.
  
  // Schedule
  schedule?: string;            // Cron expression
  isScheduled: boolean;
  lastRunAt?: Date | string;
  nextRunAt?: Date | string;
  
  // Output
  format: ReportFormat;
  outputUrl?: string;
  fileSize?: number;            // Bytes
  
  // Distribution
  recipients: string[];         // Email addresses
  
  // Status
  status: ReportStatus;
  
  // Metadata
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ScheduledReport {
  id: string;
  userId: number;
  reportType: ReportType;
  
  // Report configuration
  name: string;
  description?: string;
  parameters: any;              // Report configuration matching UI
  filters?: any;                // Location IDs, date ranges, etc.
  
  // Schedule configuration
  frequency: ScheduleFrequency;
  scheduleTime: string;         // "06:00", "14:30", etc.
  startDate: Date | string;
  timezone: string;
  scheduleDescription?: string;
  
  // Output configuration
  format: ReportFormat;
  aggregationLevel?: string;    // "15min", "1h", "1day", etc.
  selectedTimezone?: string;    // Timezone for data
  
  // Distribution
  emailRecipients: string[];    // Email addresses
  emailEnabled: boolean;
  
  // Location filtering
  locationIds: string[];        // Selected location IDs
  locationDisplay: LocationDisplay;
  plantIds: string[];           // Selected plant IDs
  
  // Status and execution
  isActive: boolean;
  lastRunAt?: Date | string;
  nextRunAt?: Date | string;
  lastStatus?: ExecutionStatus;
  errorCount: number;
  lastError?: string;
  
  // Statistics
  totalRuns: number;
  successfulRuns: number;
  
  // Metadata
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ReportExecution {
  id: string;
  reportId?: string;            // For regular reports
  scheduledReportId?: string;   // For scheduled reports
  
  // Execution details
  startedAt: Date | string;
  completedAt?: Date | string;
  duration?: number;            // Seconds
  configSnapshot?: any;         // Configuration snapshot
  
  // Result
  status: ExecutionStatus;
  outputUrl?: string;
  fileSize?: number;            // Bytes
  recordCount?: number;
  
  // Email delivery
  emailsSent?: number;
  emailRecipients?: string[];
  emailStatus?: string;         // "sent", "failed", "partial"
  
  // Error handling
  error?: string;
}

export enum ReportType {
  PRODUCTION_SUMMARY = 'PRODUCTION_SUMMARY',
  EFFICIENCY_ANALYSIS = 'EFFICIENCY_ANALYSIS',
  FORECAST_ACCURACY = 'FORECAST_ACCURACY',
  FINANCIAL_SUMMARY = 'FINANCIAL_SUMMARY',
  MAINTENANCE_REPORT = 'MAINTENANCE_REPORT',
  COMPLIANCE_REPORT = 'COMPLIANCE_REPORT',
  WEATHER_IMPACT = 'WEATHER_IMPACT',
  LOCATION_COMPARISON = 'LOCATION_COMPARISON',
  FORECAST_D1_D5 = 'FORECAST_D1_D5',                    // D+1/+5 Forecast Report
  FORECAST_MONTHLY_CONTINUED = 'FORECAST_MONTHLY_CONTINUED', // Monthly Continued Forecast Report
  CUSTOM = 'CUSTOM'
}

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  JSON = 'JSON',
  HTML = 'HTML'
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum ScheduleFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  CUSTOM = 'CUSTOM'
}

export enum LocationDisplay {
  INDIVIDUAL = 'INDIVIDUAL',   // Show separate data for each location
  AGGREGATED = 'AGGREGATED'    // Combine all locations into summary
}

// Report type definitions for UI
export interface ReportTypeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  filters: string[];           // Available filters: location, date, plant, etc.
  formats: ReportFormat[];     // Supported export formats
  schedulable: boolean;        // Can be scheduled
  estimatedTime: string;       // Estimated generation time
}

// Default report configurations matching current UI
export const REPORT_TYPE_DEFINITIONS: ReportTypeDefinition[] = [
  {
    id: 'production-summary',
    name: 'Production Summary',
    description: 'Daily, monthly, and yearly production analysis with performance metrics',
    icon: 'solar-panel',
    category: 'Production',
    filters: ['location', 'date', 'aggregation'],
    formats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV],
    schedulable: true,
    estimatedTime: '2-3 minutes'
  },
  {
    id: 'efficiency-analysis',
    name: 'Efficiency Analysis',
    description: 'System efficiency metrics, losses breakdown, and optimization recommendations',
    icon: 'efficiency',
    category: 'Performance',
    filters: ['location', 'date', 'comparison'],
    formats: [ReportFormat.PDF, ReportFormat.EXCEL],
    schedulable: true,
    estimatedTime: '3-5 minutes'
  },
  {
    id: 'forecast-accuracy',
    name: 'Forecast Accuracy',
    description: 'Model performance evaluation, MAPE analysis, and prediction quality metrics',
    icon: 'target',
    category: 'Forecasting',
    filters: ['location', 'date', 'model'],
    formats: [ReportFormat.PDF, ReportFormat.CSV],
    schedulable: true,
    estimatedTime: '1-2 minutes'
  },
  {
    id: 'maintenance-report',
    name: 'Maintenance Report',
    description: 'Scheduled maintenance, system health, and operational status overview',
    icon: 'wrench',
    category: 'Operations',
    filters: ['location', 'date', 'priority'],
    formats: [ReportFormat.PDF, ReportFormat.EXCEL],
    schedulable: true,
    estimatedTime: '2-3 minutes'
  },
  {
    id: 'financial-summary',
    name: 'Financial Summary',
    description: 'Revenue calculations, energy trading analysis, and ROI metrics',
    icon: 'chart',
    category: 'Financial',
    filters: ['location', 'date', 'currency'],
    formats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV],
    schedulable: true,
    estimatedTime: '3-4 minutes'
  },
  {
    id: 'weather-impact',
    name: 'Weather Impact Analysis',
    description: 'Weather correlation with production, seasonal patterns, and climate effects',
    icon: 'cloud',
    category: 'Analysis',
    filters: ['location', 'date', 'weather'],
    formats: [ReportFormat.PDF, ReportFormat.CSV],
    schedulable: true,
    estimatedTime: '2-4 minutes'
  },
  {
    id: 'location-comparison',
    name: 'Location Comparison',
    description: 'Multi-site performance comparison, benchmarking, and relative analysis',
    icon: 'compare',
    category: 'Analysis',
    filters: ['location', 'date', 'metrics'],
    formats: [ReportFormat.PDF, ReportFormat.EXCEL],
    schedulable: true,
    estimatedTime: '4-6 minutes'
  },
  {
    id: 'compliance-report',
    name: 'Compliance Report',
    description: 'Regulatory compliance, grid requirements, and certification status',
    icon: 'shield-check',
    category: 'Compliance',
    filters: ['location', 'date', 'regulation'],
    formats: [ReportFormat.PDF, ReportFormat.EXCEL],
    schedulable: true,
    estimatedTime: '3-5 minutes'
  }
];

// Report request interfaces
export interface ReportGenerationRequest {
  reportType: ReportType;
  name: string;
  description?: string;
  
  // Filters
  locationIds?: string[];
  plantIds?: string[];
  dateRange: {
    start: string;
    end: string;
  };
  
  // Configuration
  format: ReportFormat;
  aggregationLevel?: string;     // "15min", "1h", "1day", etc.
  selectedTimezone?: string;
  locationDisplay?: LocationDisplay;
  
  // Additional parameters
  parameters?: any;
  
  // Email delivery
  emailRecipients?: string[];
  sendEmail?: boolean;
}

export interface ScheduledReportRequest {
  reportType: ReportType;
  name: string;
  description?: string;
  
  // Schedule configuration
  frequency: ScheduleFrequency;
  scheduleTime: string;
  startDate: string;
  timezone?: string;
  
  // Report configuration
  format: ReportFormat;
  locationIds?: string[];
  plantIds?: string[];
  aggregationLevel?: string;
  locationDisplay?: LocationDisplay;
  
  // Email configuration
  emailRecipients: string[];
  emailEnabled?: boolean;
  
  // Additional parameters
  parameters?: any;
}

// Report response interfaces
export interface ReportGenerationResponse {
  success: boolean;
  data: {
    taskId: string;
    status: ExecutionStatus;
    estimatedTimeSeconds: number;
  };
  error?: string;
}

export interface ReportStatusResponse {
  success: boolean;
  data: {
    taskId: string;
    status: ExecutionStatus;
    progress: number;
    outputUrl?: string;
    fileSize?: number;
    error?: string;
  };
}

// Utility functions
export function getReportTypeDefinition(reportType: string): ReportTypeDefinition | undefined {
  return REPORT_TYPE_DEFINITIONS.find(def => def.id === reportType);
}

export function formatScheduleDescription(frequency: ScheduleFrequency, scheduleTime: string): string {
  switch (frequency) {
    case ScheduleFrequency.DAILY:
      return `Daily at ${scheduleTime}`;
    case ScheduleFrequency.WEEKLY:
      return `Weekly on Mondays at ${scheduleTime}`;
    case ScheduleFrequency.MONTHLY:
      return `Monthly on the 1st at ${scheduleTime}`;
    case ScheduleFrequency.QUARTERLY:
      return `Quarterly at ${scheduleTime}`;
    default:
      return `Custom schedule`;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) return `${minutes}m`;
  return `${minutes}m ${remainingSeconds}s`;
}