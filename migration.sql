-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'OPERATOR', 'USER', 'VIEWER', 'API_SERVICE');

-- CreateEnum
CREATE TYPE "CalibrationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'OFFLINE', 'DECOMMISSIONED', 'PLANNED');

-- CreateEnum
CREATE TYPE "TrackingType" AS ENUM ('FIXED', 'SINGLE_AXIS', 'DUAL_AXIS');

-- CreateEnum
CREATE TYPE "ResolutionType" AS ENUM ('FIFTEEN_MINUTES', 'THIRTY_MINUTES', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ForecastType" AS ENUM ('OPERATIONAL', 'D_PLUS_1_5', 'MONTHLY_CONTINUED', 'HISTORICAL', 'VALIDATION');

-- CreateEnum
CREATE TYPE "ModelType" AS ENUM ('ML_LSTM', 'ML_GRU', 'ML_XGBOOST', 'ML_RANDOMFOREST', 'ML_PROPHET', 'PHYSICAL', 'HYBRID', 'ENSEMBLE', 'PERSISTENCE', 'STATISTICAL');

-- CreateEnum
CREATE TYPE "DataQuality" AS ENUM ('GOOD', 'ESTIMATED', 'INTERPOLATED', 'POOR', 'MISSING', 'INVALID');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('PRODUCTION_LOW', 'PRODUCTION_HIGH', 'FORECAST_DEVIATION', 'SYSTEM_OFFLINE', 'MAINTENANCE_DUE', 'WEATHER_WARNING', 'DATA_QUALITY', 'THRESHOLD_BREACH', 'INVERTER_FAULT', 'GRID_OUTAGE', 'PERFORMANCE_DEGRADATION');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'EXPIRED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'CONDITION_BASED', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('PRODUCTION_SUMMARY', 'EFFICIENCY_ANALYSIS', 'FORECAST_ACCURACY', 'FINANCIAL_SUMMARY', 'MAINTENANCE_REPORT', 'COMPLIANCE_REPORT', 'WEATHER_IMPACT', 'LOCATION_COMPARISON', 'FORECAST_D1_D5', 'FORECAST_MONTHLY_CONTINUED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'EXCEL', 'CSV', 'JSON', 'HTML');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LocationDisplay" AS ENUM ('INDIVIDUAL', 'AGGREGATED');

-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('TRAINING', 'VALIDATING', 'TESTING', 'ACTIVE', 'DEPRECATED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EmailConfigType" AS ENUM ('RECIPIENTS', 'SMTP', 'TEMPLATES', 'GLOBAL');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" INTEGER,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "country" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "altitude" DOUBLE PRECISION,
    "address" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "capacityMW" DOUBLE PRECISION NOT NULL,
    "actualCapacityMW" DOUBLE PRECISION,
    "capacityKW" DOUBLE PRECISION,
    "panelCount" INTEGER,
    "panelType" TEXT,
    "panelTechnology" TEXT,
    "inverterCount" INTEGER,
    "inverterType" TEXT,
    "inverterModel" TEXT,
    "trackingSystem" "TrackingType" NOT NULL DEFAULT 'FIXED',
    "tiltAngle" DOUBLE PRECISION,
    "azimuthAngle" DOUBLE PRECISION,
    "isBifacial" BOOLEAN NOT NULL DEFAULT false,
    "nominalEfficiency" DOUBLE PRECISION,
    "temperatureCoeff" DOUBLE PRECISION,
    "bifacialityFactor" DOUBLE PRECISION,
    "dcOverpowerRatio" DOUBLE PRECISION,
    "performanceRatio" DOUBLE PRECISION,
    "installationDate" TIMESTAMP(3),
    "commissioningDate" TIMESTAMP(3),
    "warrantyEndDate" TIMESTAMP(3),
    "status" "LocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastMaintenance" TIMESTAMP(3),
    "nextMaintenance" TIMESTAMP(3),
    "expectedYield" DOUBLE PRECISION,
    "degradationRate" DOUBLE PRECISION,
    "locationData" JSONB,
    "plantData" JSONB,
    "performanceData" JSONB,
    "outputConfig" JSONB,
    "calibrationSettings" JSONB,
    "monitoringConfig" JSONB,
    "clientConfig" JSONB,
    "notes" TEXT,
    "tags" TEXT,
    "certificationData" TEXT,
    "lastMaintenanceDate" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastCalibrationDate" TIMESTAMP(3),
    "calibrationStatus" "CalibrationStatus" NOT NULL DEFAULT 'PENDING',
    "bulkOperationId" TEXT,
    "displayCapacity" TEXT,
    "displayLocation" TEXT,
    "statusDisplay" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plants" (
    "id" TEXT NOT NULL,
    "locationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "capacityMW" DOUBLE PRECISION NOT NULL,
    "inverterIds" TEXT[],
    "status" "LocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecasts" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "locationId" INTEGER NOT NULL,
    "powerMW" DOUBLE PRECISION NOT NULL,
    "powerOutputMW" DOUBLE PRECISION NOT NULL,
    "energyMWh" DOUBLE PRECISION,
    "capacityFactor" DOUBLE PRECISION,
    "powerMWQ10" DOUBLE PRECISION,
    "powerMWQ25" DOUBLE PRECISION,
    "powerMWQ75" DOUBLE PRECISION,
    "powerMWQ90" DOUBLE PRECISION,
    "powerMWLower" DOUBLE PRECISION,
    "powerMWUpper" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "confidenceLevel" DOUBLE PRECISION,
    "modelType" "ModelType" NOT NULL,
    "modelVersion" TEXT,
    "modelId" TEXT,
    "horizonMinutes" INTEGER NOT NULL,
    "horizonDays" INTEGER,
    "resolution" "ResolutionType" NOT NULL,
    "runId" TEXT,
    "forecastType" "ForecastType" NOT NULL DEFAULT 'OPERATIONAL',
    "temperature" DOUBLE PRECISION,
    "ghi" DOUBLE PRECISION,
    "dni" DOUBLE PRECISION,
    "dhi" DOUBLE PRECISION,
    "gti" DOUBLE PRECISION,
    "cloudCover" DOUBLE PRECISION,
    "windSpeed" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "pressure" DOUBLE PRECISION,
    "weatherData" JSONB,
    "qualityScore" DOUBLE PRECISION,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "validationNotes" TEXT,
    "dataQuality" "DataQuality" NOT NULL DEFAULT 'GOOD',
    "processingTime" DOUBLE PRECISION,
    "inputFeatures" JSONB,
    "modelParameters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,

    CONSTRAINT "forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "locationId" INTEGER NOT NULL,
    "powerMW" DOUBLE PRECISION NOT NULL,
    "powerOutputMW" DOUBLE PRECISION NOT NULL,
    "powerDCMW" DOUBLE PRECISION,
    "energyMWh" DOUBLE PRECISION,
    "capacityFactor" DOUBLE PRECISION,
    "performanceRatio" DOUBLE PRECISION,
    "availability" DOUBLE PRECISION,
    "efficiency" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "ambientTemp" DOUBLE PRECISION,
    "ghi" DOUBLE PRECISION,
    "dni" DOUBLE PRECISION,
    "dhi" DOUBLE PRECISION,
    "windSpeed" DOUBLE PRECISION,
    "windDirection" DOUBLE PRECISION,
    "voltage" DOUBLE PRECISION,
    "current" DOUBLE PRECISION,
    "frequency" DOUBLE PRECISION,
    "powerFactor" DOUBLE PRECISION,
    "dataQuality" "DataQuality" NOT NULL DEFAULT 'GOOD',
    "dataSource" TEXT,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "validationNotes" TEXT,
    "downtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "downtimeReason" TEXT,

    CONSTRAINT "production_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_data" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "locationId" INTEGER NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION NOT NULL,
    "pressure" DOUBLE PRECISION NOT NULL,
    "windSpeed" DOUBLE PRECISION NOT NULL,
    "windDirection" DOUBLE PRECISION NOT NULL,
    "cloudCover" DOUBLE PRECISION NOT NULL,
    "visibility" DOUBLE PRECISION,
    "precipitation" DOUBLE PRECISION,
    "precipitationType" TEXT,
    "ghi" DOUBLE PRECISION,
    "dni" DOUBLE PRECISION,
    "dhi" DOUBLE PRECISION,
    "gti" DOUBLE PRECISION,
    "extraterrestrial" DOUBLE PRECISION,
    "solarZenith" DOUBLE PRECISION,
    "solarAzimuth" DOUBLE PRECISION,
    "solarElevation" DOUBLE PRECISION,
    "airMass" DOUBLE PRECISION,
    "albedo" DOUBLE PRECISION,
    "soilingLoss" DOUBLE PRECISION,
    "snowDepth" DOUBLE PRECISION,
    "moduleTemp" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "stationId" TEXT,
    "dataQuality" "DataQuality" NOT NULL DEFAULT 'GOOD',

    CONSTRAINT "weather_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecast_accuracy" (
    "id" TEXT NOT NULL,
    "locationId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "modelType" "ModelType" NOT NULL,
    "modelVersion" TEXT,
    "mape" DOUBLE PRECISION NOT NULL,
    "rmse" DOUBLE PRECISION NOT NULL,
    "mae" DOUBLE PRECISION NOT NULL,
    "mbe" DOUBLE PRECISION,
    "r2" DOUBLE PRECISION,
    "skillScore" DOUBLE PRECISION,
    "accuracyByHorizon" JSONB,
    "sampleCount" INTEGER NOT NULL,
    "validSamples" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecast_accuracy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "locationId" INTEGER,
    "userId" INTEGER,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "thresholdValue" DOUBLE PRECISION,
    "actualValue" DOUBLE PRECISION,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" INTEGER,
    "resolution" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "notificationsSent" JSONB,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_logs" (
    "id" TEXT NOT NULL,
    "locationId" INTEGER NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "category" TEXT,
    "description" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "productionLossMWh" DOUBLE PRECISION,
    "downtime" INTEGER,
    "laborCost" DOUBLE PRECISION,
    "partsCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "performedBy" TEXT,
    "contractor" TEXT,
    "notes" TEXT,
    "attachments" TEXT[],
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "ReportType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parameters" JSONB NOT NULL,
    "filters" JSONB,
    "schedule" TEXT,
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
    "outputUrl" TEXT,
    "fileSize" INTEGER,
    "recipients" TEXT[],
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_executions" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "status" "ExecutionStatus" NOT NULL,
    "outputUrl" TEXT,
    "fileSize" INTEGER,
    "recordCount" INTEGER,
    "error" TEXT,

    CONSTRAINT "report_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parameters" JSONB NOT NULL,
    "filters" JSONB,
    "frequency" "ScheduleFrequency" NOT NULL,
    "scheduleTime" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "scheduleDescription" TEXT,
    "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
    "aggregationLevel" TEXT,
    "selectedTimezone" TEXT,
    "emailRecipients" TEXT[],
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "locationIds" TEXT[],
    "locationDisplay" "LocationDisplay" NOT NULL DEFAULT 'INDIVIDUAL',
    "plantIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastStatus" "ExecutionStatus",
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "successfulRuns" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_report_executions" (
    "id" TEXT NOT NULL,
    "scheduledReportId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "configSnapshot" JSONB NOT NULL,
    "status" "ExecutionStatus" NOT NULL,
    "outputUrl" TEXT,
    "fileSize" INTEGER,
    "recordCount" INTEGER,
    "emailsSent" INTEGER NOT NULL DEFAULT 0,
    "emailRecipients" TEXT[],
    "emailStatus" TEXT,
    "error" TEXT,

    CONSTRAINT "scheduled_report_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "type" "ModelType" NOT NULL,
    "description" TEXT,
    "algorithm" TEXT,
    "framework" TEXT,
    "hyperparameters" JSONB,
    "features" TEXT[],
    "targetVariable" TEXT,
    "trainMetrics" JSONB,
    "validMetrics" JSONB,
    "testMetrics" JSONB,
    "modelPath" TEXT NOT NULL,
    "artifactPath" TEXT,
    "checksum" TEXT,
    "fileSize" INTEGER,
    "trainDataStart" TIMESTAMP(3),
    "trainDataEnd" TIMESTAMP(3),
    "trainSampleCount" INTEGER,
    "validSampleCount" INTEGER,
    "testSampleCount" INTEGER,
    "status" "ModelStatus" NOT NULL DEFAULT 'TRAINING',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isDeployed" BOOLEAN NOT NULL DEFAULT false,
    "deployedAt" TIMESTAMP(3),
    "deploymentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trainedBy" TEXT,

    CONSTRAINT "ml_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_configurations" (
    "id" TEXT NOT NULL,
    "clientId" INTEGER,
    "name" TEXT NOT NULL,
    "type" "EmailConfigType" NOT NULL DEFAULT 'RECIPIENTS',
    "recipients" TEXT[],
    "smtpSettings" JSONB,
    "templateSettings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_clientId_idx" ON "users"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_code_key" ON "clients"("code");

-- CreateIndex
CREATE INDEX "clients_code_idx" ON "clients"("code");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_key_idx" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_clientId_idx" ON "api_keys"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "locations_code_key" ON "locations"("code");

-- CreateIndex
CREATE INDEX "locations_clientId_idx" ON "locations"("clientId");

-- CreateIndex
CREATE INDEX "locations_code_idx" ON "locations"("code");

-- CreateIndex
CREATE INDEX "locations_status_idx" ON "locations"("status");

-- CreateIndex
CREATE INDEX "locations_latitude_longitude_idx" ON "locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "locations_calibrationStatus_idx" ON "locations"("calibrationStatus");

-- CreateIndex
CREATE INDEX "locations_bulkOperationId_idx" ON "locations"("bulkOperationId");

-- CreateIndex
CREATE UNIQUE INDEX "plants_code_key" ON "plants"("code");

-- CreateIndex
CREATE INDEX "plants_locationId_idx" ON "plants"("locationId");

-- CreateIndex
CREATE INDEX "plants_code_idx" ON "plants"("code");

-- CreateIndex
CREATE INDEX "forecasts_time_location_idx" ON "forecasts"("timestamp", "locationId");

-- CreateIndex
CREATE INDEX "forecasts_time_model_idx" ON "forecasts"("timestamp", "modelType");

-- CreateIndex
CREATE INDEX "forecasts_location_time_desc_idx" ON "forecasts"("locationId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "forecasts_model_time_desc_idx" ON "forecasts"("modelType", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "forecasts_horizon_time_idx" ON "forecasts"("horizonMinutes", "timestamp");

-- CreateIndex
CREATE INDEX "forecasts_run_time_idx" ON "forecasts"("runId", "timestamp");

-- CreateIndex
CREATE INDEX "forecasts_resolution_time_idx" ON "forecasts"("resolution", "timestamp");

-- CreateIndex
CREATE INDEX "forecasts_type_time_idx" ON "forecasts"("forecastType", "timestamp");

-- CreateIndex
CREATE INDEX "production_time_location_idx" ON "production"("timestamp", "locationId");

-- CreateIndex
CREATE INDEX "production_location_time_desc_idx" ON "production"("locationId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "production_time_quality_idx" ON "production"("timestamp", "dataQuality");

-- CreateIndex
CREATE INDEX "production_quality_time_idx" ON "production"("dataQuality", "timestamp");

-- CreateIndex
CREATE INDEX "weather_time_location_idx" ON "weather_data"("timestamp", "locationId");

-- CreateIndex
CREATE INDEX "weather_location_time_desc_idx" ON "weather_data"("locationId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "weather_time_source_idx" ON "weather_data"("timestamp", "source");

-- CreateIndex
CREATE INDEX "weather_source_time_idx" ON "weather_data"("source", "timestamp");

-- CreateIndex
CREATE INDEX "forecast_accuracy_locationId_idx" ON "forecast_accuracy"("locationId");

-- CreateIndex
CREATE INDEX "forecast_accuracy_date_idx" ON "forecast_accuracy"("date");

-- CreateIndex
CREATE INDEX "forecast_accuracy_modelType_idx" ON "forecast_accuracy"("modelType");

-- CreateIndex
CREATE UNIQUE INDEX "forecast_accuracy_locationId_date_modelType_modelVersion_key" ON "forecast_accuracy"("locationId", "date", "modelType", "modelVersion");

-- CreateIndex
CREATE INDEX "alerts_locationId_idx" ON "alerts"("locationId");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "alerts_severity_idx" ON "alerts"("severity");

-- CreateIndex
CREATE INDEX "alerts_triggeredAt_idx" ON "alerts"("triggeredAt");

-- CreateIndex
CREATE INDEX "alerts_type_idx" ON "alerts"("type");

-- CreateIndex
CREATE INDEX "maintenance_logs_locationId_idx" ON "maintenance_logs"("locationId");

-- CreateIndex
CREATE INDEX "maintenance_logs_scheduledAt_idx" ON "maintenance_logs"("scheduledAt");

-- CreateIndex
CREATE INDEX "maintenance_logs_status_idx" ON "maintenance_logs"("status");

-- CreateIndex
CREATE INDEX "reports_userId_idx" ON "reports"("userId");

-- CreateIndex
CREATE INDEX "reports_type_idx" ON "reports"("type");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "report_executions_reportId_idx" ON "report_executions"("reportId");

-- CreateIndex
CREATE INDEX "report_executions_startedAt_idx" ON "report_executions"("startedAt");

-- CreateIndex
CREATE INDEX "scheduled_reports_userId_idx" ON "scheduled_reports"("userId");

-- CreateIndex
CREATE INDEX "scheduled_reports_reportType_idx" ON "scheduled_reports"("reportType");

-- CreateIndex
CREATE INDEX "scheduled_reports_isActive_idx" ON "scheduled_reports"("isActive");

-- CreateIndex
CREATE INDEX "scheduled_reports_nextRunAt_idx" ON "scheduled_reports"("nextRunAt");

-- CreateIndex
CREATE INDEX "scheduled_report_executions_scheduledReportId_idx" ON "scheduled_report_executions"("scheduledReportId");

-- CreateIndex
CREATE INDEX "scheduled_report_executions_startedAt_idx" ON "scheduled_report_executions"("startedAt");

-- CreateIndex
CREATE INDEX "scheduled_report_executions_status_idx" ON "scheduled_report_executions"("status");

-- CreateIndex
CREATE INDEX "ml_models_type_idx" ON "ml_models"("type");

-- CreateIndex
CREATE INDEX "ml_models_status_idx" ON "ml_models"("status");

-- CreateIndex
CREATE INDEX "ml_models_isDefault_idx" ON "ml_models"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "ml_models_name_version_key" ON "ml_models"("name", "version");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- CreateIndex
CREATE INDEX "system_configs_category_idx" ON "system_configs"("category");

-- CreateIndex
CREATE INDEX "system_configs_key_idx" ON "system_configs"("key");

-- CreateIndex
CREATE INDEX "email_configurations_clientId_idx" ON "email_configurations"("clientId");

-- CreateIndex
CREATE INDEX "email_configurations_type_idx" ON "email_configurations"("type");

-- CreateIndex
CREATE INDEX "email_configurations_isActive_idx" ON "email_configurations"("isActive");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production" ADD CONSTRAINT "production_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_data" ADD CONSTRAINT "weather_data_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_report_executions" ADD CONSTRAINT "scheduled_report_executions_scheduledReportId_fkey" FOREIGN KEY ("scheduledReportId") REFERENCES "scheduled_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_configurations" ADD CONSTRAINT "email_configurations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

