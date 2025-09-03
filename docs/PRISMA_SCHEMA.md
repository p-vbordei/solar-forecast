# Prisma Database Schema Documentation

## Overview
This document describes the comprehensive database schema for the Solar Forecast Platform. The schema is designed following industry best practices for solar energy management systems and supports all use cases for forecasts, historical data, and operations management.

## Key Features
- **Time-series optimized**: Designed for efficient storage of temporal data (forecasts, production, weather)
- **Multi-tenancy ready**: Support for multiple clients and locations
- **Comprehensive tracking**: Forecasts, actual production, weather data, and accuracy metrics
- **Industry standard metrics**: All relevant solar performance indicators
- **Audit & compliance**: Full audit logging and reporting capabilities
- **ML model management**: Complete model lifecycle tracking

## Database Tables

### Core Business Entities

#### 1. **Users** (`users`)
- User management with role-based access control
- Roles: ADMIN, MANAGER, OPERATOR, USER, VIEWER, API_SERVICE
- Supports both human users and API services

#### 2. **Clients** (`clients`)
- Multi-tenant client/company management
- Contract tracking and timezone support
- Currency configuration for financial calculations

#### 3. **Locations** (`locations`)
- Solar installation sites with comprehensive technical specifications
- Supports various tracking systems (Fixed, Single-axis, Dual-axis)
- Performance benchmarks and degradation tracking
- Status: ACTIVE, MAINTENANCE, OFFLINE, DECOMMISSIONED, PLANNED

#### 4. **Plants** (`plants`)
- Sub-arrays within large installations
- Inverter tracking and capacity management

### Time-Series Data

#### 5. **Forecasts** (`forecasts`)
- **Resolution**: 15, 30, or 60-minute intervals
- **Confidence bands**: Upper/lower bounds with confidence levels
- **Model tracking**: Links to ML models and versions
- **Weather inputs**: Complete meteorological context
- **Quality scoring**: 0-1 quality indicators
- **Horizon tracking**: Minutes ahead for each forecast

#### 6. **Production** (`production`)
- **Actual production data** with industry-standard metrics:
  - Power (AC/DC) in MW
  - Energy in MWh
  - Capacity Factor
  - Performance Ratio (PR)
  - Availability percentage
- **Environmental conditions**: Temperature, irradiance (GHI, DNI, DH I)
- **Electrical parameters**: Voltage, current, frequency, power factor
- **Data quality flags**: GOOD, ESTIMATED, INTERPOLATED, POOR, MISSING, INVALID
- **Downtime tracking**: Duration and reasons

#### 7. **Weather Data** (`weather_data`)
- **Basic metrics**: Temperature, humidity, pressure, wind
- **Solar radiation** (industry standard):
  - GHI: Global Horizontal Irradiance
  - DNI: Direct Normal Irradiance
  - DHI: Diffuse Horizontal Irradiance
  - GTI: Global Tilted Irradiance (POA)
- **Solar position**: Zenith, azimuth, elevation, air mass
- **Additional factors**: Albedo, soiling loss, snow depth
- **Source tracking**: OpenWeather, Satellite, Station

#### 8. **Forecast Accuracy** (`forecast_accuracy`)
- **Industry standard metrics**:
  - MAPE: Mean Absolute Percentage Error
  - RMSE: Root Mean Square Error
  - MAE: Mean Absolute Error
  - MBE: Mean Bias Error
  - R²: Coefficient of determination
- **Skill scores**: Comparison vs persistence model
- **Horizon analysis**: Accuracy by forecast horizon

### Operations & Maintenance

#### 9. **Alerts** (`alerts`)
- **Types**: Production anomalies, forecast deviations, maintenance, weather warnings
- **Severities**: INFO, WARNING, CRITICAL, EMERGENCY
- **Status tracking**: ACTIVE, ACKNOWLEDGED, RESOLVED, EXPIRED, SUPPRESSED
- **Threshold monitoring**: Actual vs expected values

#### 10. **Maintenance Logs** (`maintenance_logs`)
- **Types**: Preventive, Corrective, Predictive, Condition-based, Emergency
- **Impact tracking**: Production loss, downtime
- **Cost tracking**: Labor, parts, total costs
- **Documentation**: Notes and attachments

### Analytics & Reporting

#### 11. **Reports** (`reports`)
- **Types**: Production, Efficiency, Forecast Accuracy, Financial, Compliance
- **Scheduling**: Cron-based scheduling support
- **Formats**: PDF, Excel, CSV, JSON, HTML
- **Distribution**: Email recipient management

#### 12. **Report Executions** (`report_executions`)
- Execution history and performance tracking
- Output storage and error handling

### ML Model Management

#### 13. **ML Models** (`ml_models`)
- **Comprehensive model registry**:
  - Multiple algorithms: LSTM, GRU, XGBoost, Random Forest, Prophet
  - Physical, Hybrid, and Ensemble models
- **Training tracking**: Data ranges, sample counts
- **Performance metrics**: Train/validation/test metrics
- **Deployment status**: Active models and endpoints
- **Version control**: Multiple versions per model type

### System & Compliance

#### 14. **API Keys** (`api_keys`)
- Secure API access for Python worker and external services
- Permission-based access control
- Expiration and usage tracking

#### 15. **Audit Logs** (`audit_logs`)
- Complete audit trail for compliance
- Tracks all CRUD operations
- User actions and changes

#### 16. **System Configs** (`system_configs`)
- Global configuration storage
- Category-based organization

## Index Strategy
The schema includes comprehensive indexing for:
- Time-series queries (timestamp + locationId)
- Foreign key relationships
- Status and type enumerations
- Frequently queried fields
- Geospatial queries (latitude, longitude)

## Best Practices Implemented

### 1. **Data Quality**
- Quality flags on all measurement data
- Validation fields for manual review
- Source tracking for data lineage

### 2. **Performance Optimization**
- Composite indexes for time-series queries
- UUID primary keys for distributed systems
- JSON fields for flexible metadata

### 3. **Industry Standards**
- All standard solar metrics (PR, CF, Availability)
- Complete irradiance components (GHI, DNI, DHI, GTI)
- Standard error metrics (MAPE, RMSE, MAE)

### 4. **Scalability**
- Ready for TimescaleDB hypertables
- Multi-tenant architecture
- API service support

### 5. **Security & Compliance**
- Complete audit logging
- Role-based access control
- API key management

## Integration Points

### Python Worker
The schema supports the Python worker through:
- API key authentication
- Forecast model references
- Weather data storage
- ML model registry

### Frontend Applications
Optimized for:
- Real-time dashboards
- Historical analysis
- Report generation
- Alert management

## Migration Notes
- Database uses PostgreSQL
- Consider TimescaleDB for production (hypertables for time-series)
- All timestamps in UTC
- Monetary values default to EUR

## Future Considerations
- Partitioning strategy for time-series tables
- Archival strategy for old data
- Read replicas for analytics
- Caching layer for frequently accessed data