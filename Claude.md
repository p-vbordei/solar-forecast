# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

AM NEVOIE CA ACESTE ELEMENTE DE DESIGN SA FIE IMPLEMENTATE PRIN TAILWIND CSS
# ICONITELE VOR FI DE TIP LINEART / VECTORIALA SI NU VOR FI ICONITE DE TIP SVG



#### PLEASE BE VERY CAREFUL REGARDING LOCATION IDs.
WE USE UUID / GUID that are strings and not integers.

#### **🎨 Color Palette**
Primary colors for the futuristic energy trading interface:

```css
/* Core Brand Colors */
--color-dark-petrol: #003135;    /* Deep petrol blue (main background) */
--color-teal-dark: #024950;      /* Teal blue (secondary background) */
--color-alert-red: #DC2626;      /* Vibrant red for alerts and warnings */
--color-alert-orange: #EA580C;   /* Orange for medium alerts */
--color-cyan: #0FA4AF;           /* Cyan teal (primary highlights) */
--color-soft-blue: #AFDDE5;      /* Soft light blue (text on dark) */
```

**Usage Guidelines:**
- **Backgrounds**: Use `#003135` or `#024950` for dark sections
- **Primary Text**: Use `#AFDDE5` or white on dark backgrounds
- **Interactive Elements**: Use `#0FA4AF` for links, buttons, active states
- **Alert Colors**: Use `#DC2626` for critical/high alerts, `#EA580C` for medium alerts
- **Cards/Panels**: Dark petrol with subtle borders in soft blue

#### **🔤 Typography**
Modern, technical font stack:

```css
/* Font Stack */
--font-primary: 'Inter', -apple-system, sans-serif;
--font-mono: 'Roboto Mono', 'SF Mono', monospace;

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

#### **✨ Design Principles**

1. **High Contrast**: Ensure all text has sufficient contrast against dark backgrounds
2. **Futuristic Aesthetic**: Clean lines, subtle gradients, tech-inspired elements
3. **Energy Focus**: Use cyan/teal for energy-related metrics and visualizations
4. **Minimalist**: Reduce visual clutter, focus on data clarity
5. **Responsive**: Mobile-first approach with fluid typography

#### **🏗️ Component Patterns**

**Cards:**
```css
.card-dark {
  background: linear-gradient(135deg, #003135 0%, #024950 100%);
  border: 1px solid rgba(175, 221, 229, 0.2);
  backdrop-filter: blur(10px);
}
```

**Buttons:**
```css
.btn-primary {
  background: #0FA4AF;
  color: #003135;
  font-weight: 600;
}

.btn-primary:hover {
  background: #AFDDE5;
  transform: translateY(-1px);
}
```

**Data Display:**
- Use monospace font for numbers and codes
- Cyan highlights for positive values
- Brick red for negative/warning values
- Soft blue for neutral information

### **Legacy Color System (DEPRECATED)**
The following colors should be phased out:

#### **Primary Brand Colors** (Main UI Elements)
- `primary-50` to `primary-950` - Professional blue scale for buttons, links, active states
- Primary brand color: `primary-600` (#0284c7)

#### **Accent Colors** (Text & Backgrounds)
- `accent-50` to `accent-950` - Sophisticated gray-blue for text, borders, backgrounds
- Main text: `accent-900`, Secondary text: `accent-600`, Borders: `accent-200`

#### **Semantic Colors**
- `success-*` - Green scale for positive states
- `warning-*` - Amber scale for warnings
- `danger-*` - Red scale for errors
- `neutral-*` - Pure gray scale for neutral elements

### **Required Component Classes**
Always use these pre-built classes from `app.css`:

#### **Buttons**
- `.btn-primary` - Main actions (blue background)
- `.btn-secondary` - Secondary actions (white with border)
- `.btn-success` - Positive actions (green)
- `.btn-warning` - Warning actions (amber)
- `.btn-danger` - Destructive actions (red)
- `.btn-ghost` - Minimal actions (no background)
- `.btn-outline` - Outlined primary style

#### **Form Elements**
- `.input` - Text inputs with brand focus states
- `.select` - Dropdown selects with brand styling
- `.textarea` - Textarea with brand styling
- `.label` - Form labels with brand typography

#### **Cards & Containers**
- `.card` - Standard white card with brand shadows
- `.card-elevated` - Card with stronger elevation
- `.card-accent` - Card with brand accent background
- `.card-success/.card-warning/.card-danger` - Semantic cards
- `.metric-card` - For displaying metrics/KPIs

#### **Status Elements**
- `.status-success/.status-warning/.status-danger/.status-info/.status-neutral/.status-active`

#### **Tables**
- `.table` - Complete table styling with brand colors
- `.table-row-hover` - Hover effects for table rows

#### **Navigation**
- `.nav-link` - Navigation item styling
- `.nav-link-active` - Active navigation state

### **Layout Utilities**
- `.page-container` - Max-width container with proper padding
- `.section-header` - Page section headers with brand styling
- `.content-header` - Content area headers
- `.divider` - Horizontal dividers with brand colors

### **Brand Guidelines Enforcement**
1. **Before making ANY frontend changes**, verify component exists in `app.css`
2. **If new styling needed**, extend existing classes or create new ones following brand patterns
3. **Never use** arbitrary colors - only use the brand color system
4. **Test visual consistency** across all pages after changes
5. **Follow existing patterns** seen in the dashboard, reports, and mandates pages

### **Quick Reference - Approved Colors Only:**
```css
/* Text Colors */
text-accent-900   /* Primary text */
text-accent-600   /* Secondary text */
text-accent-500   /* Muted text */

/* Background Colors */
bg-accent-50      /* Light page background */
bg-white          /* Card backgrounds */
bg-primary-50     /* Accent backgrounds */

/* Border Colors */
border-accent-200 /* Standard borders */
border-accent-300 /* Input borders */

/* Interactive Colors */
text-primary-600  /* Links */
bg-primary-600    /* Primary buttons */
```

**🚫 FORBIDDEN:** Never use `gray-*`, `blue-*`, `slate-*`, `zinc-*` or other non-brand colors.**

### **Brand Reference Files**
- **Color System**: `/frontend/tailwind.config.js` - Complete brand color definitions
- **Component Library**: `/frontend/src/app.css` - All approved component classes
- **Examples**:
  - `/frontend/src/routes/+page.svelte` - Dashboard (perfect brand implementation)
  - `/frontend/src/routes/reports/+page.svelte` - Reports page (brand compliant)
  - `/frontend/src/routes/mandates/+page.svelte` - Mandates page (brand compliant)

### **Brand Compliance Checklist**
Before any frontend commit, verify:
- [ ] No `gray-*`, `blue-*`, `indigo-*`, `slate-*`, `zinc-*` classes used
- [ ] All buttons use `.btn-*` classes
- [ ] All inputs use `.input`, `.select`, `.textarea` classes
- [ ] All cards use `.card*` classes
- [ ] All tables use `.table` class
- [ ] All text uses `text-accent-*` or `text-primary-*` colors
- [ ] All backgrounds use approved brand colors only
- [ ] Status elements use `.status-*` classes
- [ ] Navigation uses `.nav-link*` classes

**VIOLATION OF BRAND GUIDELINES WILL RESULT IN IMMEDIATE REJECTION OF CHANGES.**


## 🚧 **IMPLEMENTATION PRIORITY OVERRIDE**

**⚠️ AUTHENTICATION SYSTEM DEFERRED ⚠️**
- **Decision**: Skip JWT authentication implementation until final phase
- **Current**: Continue using hardcoded user IDs for development
- **Rationale**: Focus on core business functionality first
- **Timeline**: Authentication will be implemented as the very last step before production deployment

**Development Priority Order:**
1. ✅ ~~Authentication~~ - **DEFERRED TO END**
2. 🟡 **Market Data Integration** - Start here
3. 🟡 **Risk Engine Implementation** - Second priority
4. 🟠 **Reporting System** - Third priority
5. 🔴 **Authentication System** - Final step before production




## Architecture Overview

### Tech Stack Rationale
- **SvelteKit**: Full-stack framework with built-in API routes, simpler than React
- **Tailwind CSS**: Utility-first CSS, no runtime overhead
- **Prisma**: Type-safe database access, excellent DX
- **FastAPI**: High-performance Python API for analytics

  Correct Architecture:
  - SvelteKit: Full-stack framework with Controller/Service/Repository layers (using Prisma ORM)
  - Python Worker: Microservice for ML/analytics tasks only (called by SvelteKit backend)



Database is TimescaleDB (PostgreSQL extension for time-series)
Implementation ( Deployment) will be done on Railway.

Tot ce tine de python se va instala folosind uv: UV (Uniform Version Manager) is an all-in-one, ultra-fast Python package and project manager developed by Astral, aiming to replace tools like pip, venv, pipx, and poetry with a single, faster solution written in Rust.
https://github.com/astral-sh/uv


Vom pune tot codul de python intr-un python worker, care va fi deci parte dintr-un **worker**.




# vei crea un logs.md in care iti vei nota prompturile ce ti-am cerut si ce ai incercat sa faci ca sa ai o evidenta

# For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially.
# Pentru eficiență maximă → când sunt necesare operații independente, acestea trebuie executate în paralel, nu secvențial.

# ICONITELE VOR FI DE TIP LINEART / VECTORIALA SI NU VOR FI ICONITE DE TIP SVG


## !!!! FOARTE IMPORTNT !!!
VA FI FOLOSITA STRUCTURA CSR
1. Controller Layer: The Controller layer handles incoming HTTP requests, processes them, and returns the appropriate HTTP responses. It acts as an intermediary between the client and the service layer. Keep Controllers Thin: Controllers should only handle request validation and response generation. All business logic should reside in the Service layer.

2. Service Layer: The Service layer contains the business logic of the application. It processes the data received from the controller, performs necessary operations, and communicates with the repository layer to fetch or persist data.

3. Repository Layer: The Repository layer handles data access and persistence. It communicates with the database or other data sources, encapsulating the logic for querying, saving, and updating data.

Each layer has a specific responsibility, making the code easier to manage, test, and scale.

Aplicatia trebuie dimensionata pentru a gestiona:
- 10 utilizatori concurenti
- 100 de locuri pentru care se va face prognoza de productie solara
- 5 firme care vor fi conectate la aplicatie ( 10 utilizatori per firma, dar nu concurenti)




### Code Style for PYTHON
- **NO CLASSES** - Use functions and dictionaries
- Clear variable names
- Comprehensive docstrings
- Type hints where helpful
- Linear flow - avoid deep nesting

### Configuration Updates
1. Update client YAML for client-specific changes
2. Update `config.yaml` for system-wide changes
3. Add new env vars to `.env.example`

## 📊 IMPLEMENTATION STATUS - Solar Forecast Platform

### ✅ Phase 1 Completed (Current)
The foundation of the Solar Forecast Platform has been successfully implemented:

#### **Project Structure**
```
solar/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte        # Main layout with sidebar navigation
│   │   ├── +page.svelte          # Dashboard with real-time metrics
│   │   └── api/locations/        # CSR pattern API implementation
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Navigation.svelte # Line-art icon navigation
│   │   │   ├── Header.svelte     # Real-time clock & weather
│   │   │   └── dashboard/
│   │   │       ├── MetricCard.svelte
│   │   │       ├── ProductionChart.svelte
│   │   │       ├── AlertsPanel.svelte
│   │   │       ├── LocationsMap.svelte
│   │   │       └── ForecastAccuracy.svelte
│   │   ├── server/
│   │   │   ├── services/         # Business logic layer
│   │   │   │   └── location.service.ts
│   │   │   └── repositories/     # Data access layer
│   │   │       └── location.repository.ts
│   │   └── types/                # TypeScript definitions
│   │       └── location.ts
│   └── app.css                   # Global styles with dark theme
├── tailwind.config.js            # Dark theme configuration
├── package.json                  # Dependencies
└── README.md                     # Setup instructions
```

#### **Implemented Features**
1. **Dark Theme UI** ✅
   - Colors: #003135 (dark-petrol), #024950 (teal-dark), #0FA4AF (cyan), #AFDDE5 (soft-blue)
   - Glass morphism effects with backdrop-blur
   - Smooth animations and transitions

2. **CSR Architecture** ✅
   - Controller: `/routes/api/locations/+server.ts`
   - Service: `/lib/server/services/location.service.ts`
   - Repository: `/lib/server/repositories/location.repository.ts`

3. **Dashboard Components** ✅
   - Real-time production monitoring
   - Alert system with priority levels
   - Location overview with status indicators
   - Forecast accuracy analysis
   - Interactive charts using ECharts

4. **Navigation System** ✅
   - Sidebar with line-art SVG icons
   - Active route highlighting
   - User profile section
   - Real-time weather and clock display

### ✅ Phase 2 - Completed
- [x] Database integration with Prisma
- [x] CSR Architecture in SvelteKit (Controller/Service/Repository)
- [x] Python worker as ML microservice
- [x] TimescaleDB database schema
- [x] Reports page with 8 report types
- [x] Advanced analysis page with forecast visualization
- [x] Comprehensive Prisma schema (16 models)

### 📋 Phase 3 - Planned
- [ ] WebSocket real-time updates
- [ ] ML model integration
- [ ] Connect Python worker to database

### 🔴 Phase 4 - Deferred
- [ ] JWT Authentication (intentionally deferred to final phase)

## 📊 LATEST UPDATES (2025-09-03)

### New Pages Implemented
1. **Reports Page** (`/reports`)
   - 8 report types: Production, Efficiency, Forecast Accuracy, Maintenance, Financial, Compliance, Weather Impact, Location Comparison
   - Category filtering and date range selection
   - Export formats: PDF, Excel, CSV
   - Recent reports tracking

2. **Analysis Page** (`/analysis`)
   - Advanced forecast visualization with ECharts
   - Time aggregation: 15min, hourly, daily, weekly
   - Confidence bands visualization
   - Accuracy metrics: MAPE, RMSE, MAE
   - Auto-refresh and manual refresh options
   - Export functionality

### Database Schema (Prisma) - Industry Standard
**16 Comprehensive Models:**
- **Core**: User, Client, Location, Plant, ApiKey
- **Time-Series**: Forecast, Production, WeatherData, ForecastAccuracy
- **Operations**: Alert, MaintenanceLog, Report, ReportExecution
- **ML**: MLModel (version control, deployment tracking)
- **System**: AuditLog, SystemConfig

**Key Features:**
- Industry-standard solar metrics (PR, CF, Availability)
- Complete irradiance tracking (GHI, DNI, DHI, GTI)
- Forecast confidence bands and quality scores
- Data quality flags and validation
- Ready for TimescaleDB hypertables
- Multi-tenant architecture support

### **Running the Application**

#### 1. Start TimescaleDB Database
```bash
# Ensure TimescaleDB is running (PostgreSQL with TimescaleDB extension)
# Database: solar_forecast
# 
# Health check endpoint: GET /api/timescale/health
# Performance stats: GET /api/timescale/stats?location_id=1&hours=24
```

#### 2. Start Python Worker (ML Microservice)
```bash
cd /Users/vladbordei/Documents/Development/solar/python-worker
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8001
# Python Worker API: http://localhost:8001
```

#### 3. Start SvelteKit Application
```bash
cd /Users/vladbordei/Documents/Development/solar
npm install
npx prisma generate
npx prisma db push
npm run dev
# Frontend: http://localhost:5173
```

### **Key Design Decisions**
- **NO EMOJIS** in UI - Only line-art/vector icons
- **CSR Pattern** in SvelteKit - Controller/Service/Repository layers
- **Prisma ORM** for type-safe database access
- **Python Worker** as pure microservice for ML/analytics only
- **Dark Theme Only** - No light mode switch
- **TypeScript** throughout for type safety

### **Architecture Summary**
- **SvelteKit Backend**: Handles all business logic, database operations, API routes
- **Python Worker**: ML microservice for forecasting, weather data, and analytics
- **Database**: TimescaleDB (PostgreSQL extension) with Prisma ORM for time-series data
- **Communication**: SvelteKit services call Python worker via HTTP for ML tasks

## 🏗️ **TIMESCALEDB & PRISMA ORM INTEGRATION**

### **Complete TimescaleDB Optimization Stack**
The Solar Forecast Platform is fully optimized for time-series data with comprehensive TimescaleDB integration:

#### **Enhanced Prisma Client Configuration** (`src/lib/server/database.ts:10-48`)
```typescript
// Production-ready Prisma Client with TimescaleDB optimizations
export const db = new PrismaClient({
  // Enhanced logging for TimescaleDB monitoring
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' }
  ],
  
  // Transaction optimization for time-series workloads
  transactionOptions: {
    maxWait: 5000,      // 5 seconds max wait
    timeout: 30000,     // 30 seconds timeout (bulk inserts)
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
  }
});
```

#### **Intelligent Prisma Middleware** (`src/lib/server/database.ts:83-135`)
**Automatic Query Optimization for Time-Series Tables:**
- **Auto-ordering** by `timestamp DESC` for better chunk scanning
- **Automatic recent data filtering** (7 days) to prevent full table scans
- **Bulk insert optimization** with timestamp sorting for chunk alignment
- **Performance monitoring** with slow query detection (>500ms)

**Target Tables:** `forecasts`, `production`, `weather_data`

```typescript
// Example: Automatic optimization applied to queries
db.forecast.findMany() 
// Automatically becomes:
// db.forecast.findMany({ 
//   orderBy: { timestamp: 'desc' },
//   where: { timestamp: { gte: new Date(Date.now() - 7*24*60*60*1000) } }
// })
```

#### **Type-Safe TimescaleDB Query Helpers** (`src/lib/server/database.ts:166-360`)

**1. Advanced Time-Bucket Queries:**
```typescript
// Aggregated solar production by hour with multiple metrics
const hourlyProduction = await TimescaleQueries.timeBucket({
  interval: '1 hour',
  table: 'production',
  aggregations: {
    avg: ['power_mw', 'capacity_factor'],
    max: ['power_mw'],
    sum: ['energy_mwh']
  },
  where: 'location_id = 1 AND timestamp >= NOW() - INTERVAL \'24 hours\'',
  limit: 24
});
```

**2. Optimized Bulk Inserts:**
```typescript
// High-performance bulk insert with validation and sorting
const result = await TimescaleQueries.bulkInsert('forecasts', forecastData, {
  batchSize: 1000,
  onConflict: 'ignore',
  validateTimestamps: true
});
// Returns: { inserted: 5000, batches: 5, table: 'forecasts' }
```

**3. Continuous Aggregates Integration:**
```typescript
// Fast dashboard queries using pre-computed aggregates
const dailyStats = await TimescaleQueries.getProductionDaily(locationId, 30);
const hourlyStats = await TimescaleQueries.getProductionHourly(locationId, 24);
```

#### **Production Monitoring & Health Checks**

**1. Real-time Health Monitoring** (`src/routes/api/timescale/health/+server.ts`)
```typescript
GET /api/timescale/health
// Returns comprehensive TimescaleDB status:
{
  "connected": true,
  "timescaleEnabled": true,
  "hypertables": 3,
  "compressionEnabled": true,
  "stats": {
    "forecasts": { "chunks": 45, "compressed": 12 },
    "production": { "chunks": 38, "compressed": 10 },
    "weather_data": { "chunks": 52, "compressed": 18 }
  }
}
```

**2. Performance Statistics API** (`src/routes/api/timescale/stats/+server.ts`)
```typescript
GET /api/timescale/stats?location_id=1&hours=24
// Returns optimized time-series analytics using continuous aggregates
```

#### **Advanced TimescaleDB Features**

**1. Automatic Hypertable Conversion** (`prisma/migrations/timescaledb_setup.sql`)
- Converts time-series tables to hypertables with optimal chunk intervals
- **Forecasts**: 1 day chunks (high-frequency predictions)
- **Production**: 7 day chunks (actual production data)
- **Weather**: 1 day chunks (meteorological data)

**2. Continuous Aggregates for Fast Dashboards**
```sql
-- Pre-computed hourly production metrics
CREATE MATERIALIZED VIEW production_hourly AS
SELECT 
  time_bucket('1 hour', timestamp) as bucket,
  location_id,
  AVG(power_mw) as avg_power_mw,
  MAX(power_mw) as max_power_mw,
  AVG(capacity_factor) as avg_capacity_factor,
  COUNT(*) as sample_count
FROM production
GROUP BY bucket, location_id;
```

**3. Compression & Retention Policies**
```sql
-- Automatic compression after 7 days
SELECT add_compression_policy('forecasts', INTERVAL '7 days');

-- Data retention: 2 years for forecasts, 5 years for production
SELECT add_retention_policy('forecasts', INTERVAL '2 years');
SELECT add_retention_policy('production', INTERVAL '5 years');
```

#### **Performance Optimizations**

**1. Query Optimization:**
- **Index strategy**: Composite indexes on (location_id, timestamp DESC)
- **Chunk exclusion**: Automatic time-based partition pruning
- **Parallel processing**: Chunk-aware parallel query execution

**2. Insert Performance:**
- **Sorted inserts**: Automatic timestamp ordering for chunk alignment
- **Batch processing**: Configurable batch sizes (default: 1000 records)
- **Conflict handling**: Efficient duplicate detection and handling

**3. Memory Management:**
- **Connection pooling**: Optimized for concurrent time-series workloads
- **Query caching**: Prisma query result caching
- **Chunk caching**: TimescaleDB chunk metadata caching

### **Database Commands**
```bash
# Initialize TimescaleDB hypertables and optimizations
npm run db:migrate-timescale

# Validate TimescaleDB configuration and performance
npm run db:validate-timescale

# Apply production optimizations (compression, retention)
npm run db:optimize-timescale
```

### **Monitoring & Observability**
- **Query performance logging**: Development and production query monitoring
- **Slow query alerts**: Automatic detection of queries >1000ms in production
- **Hypertable statistics**: Real-time chunk and compression metrics
- **Health check endpoints**: Comprehensive TimescaleDB status monitoring

### **Production Readiness Features**
- **Multi-tenant support**: Isolated data by client_id across all models
- **Audit logging**: Complete operation tracking in `audit_logs` table  
- **Data validation**: Timestamp validation and data quality checks
- **Error handling**: Comprehensive error logging and recovery
- **Scalability**: Designed for 100 locations × 5 clients × 10 concurrent users

## 🔧 **REPLICATING TIMESCALEDB PATTERNS FOR NEW ENDPOINTS**

### **Step-by-Step Guide to Create TimescaleDB-Optimized API Endpoints**

#### **1. Follow the Established CSR Pattern**
```
src/routes/api/[endpoint]/
├── +server.ts           # Controller (HTTP handling)
└── service.ts           # Service (business logic)
└── repository.ts        # Repository (database access)
```

#### **2. Controller Layer Example** (`src/routes/api/weather/+server.ts`)
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { WeatherService } from '$lib/server/services/weather.service';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const locationId = parseInt(url.searchParams.get('location_id') ?? '1');
    const hours = parseInt(url.searchParams.get('hours') ?? '24');
    
    const service = new WeatherService();
    const weatherData = await service.getRecentWeather(locationId, hours);
    
    return json(weatherData);
  } catch (error) {
    console.error('Weather API error:', error);
    return json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
};
```

#### **3. Service Layer with TimescaleDB Integration** (`src/lib/server/services/weather.service.ts`)
```typescript
import { WeatherRepository } from '../repositories/weather.repository';
import { TimescaleQueries } from '../database';

export class WeatherService {
  private repository = new WeatherRepository();

  async getRecentWeather(locationId: number, hours: number = 24) {
    // Use TimescaleDB helper for optimized time-series queries
    return await TimescaleQueries.timeBucket({
      interval: '1 hour',
      table: 'weather_data',
      aggregations: {
        avg: ['temperature_c', 'humidity_percent', 'ghi_w_m2'],
        max: ['wind_speed_ms', 'ghi_w_m2'],
        min: ['temperature_c']
      },
      where: `location_id = ${locationId} AND timestamp >= NOW() - INTERVAL '${hours} hours'`,
      groupBy: ['location_id'],
      limit: hours
    });
  }

  async bulkInsertWeatherData(weatherData: WeatherData[]) {
    // Use optimized bulk insert with automatic sorting
    return await TimescaleQueries.bulkInsert('weather_data', weatherData, {
      batchSize: 1000,
      onConflict: 'ignore',
      validateTimestamps: true
    });
  }
}
```

#### **4. Repository Layer with Prisma Optimization** (`src/lib/server/repositories/weather.repository.ts`)
```typescript
import { db } from '../database';
import type { WeatherData } from '$lib/types/weather';

export class WeatherRepository {
  async findRecentByLocation(locationId: number, hours: number = 24) {
    // Prisma middleware will automatically optimize this query:
    // - Add timestamp DESC ordering
    // - Add recent data filter if none specified
    // - Log performance metrics
    return await db.weatherData.findMany({
      where: {
        locationId,
        // Optional: explicit time filter (middleware adds default if missing)
        timestamp: {
          gte: new Date(Date.now() - hours * 60 * 60 * 1000)
        }
      },
      // orderBy automatically added by middleware if missing
      take: 1000 // Limit results for performance
    });
  }

  async bulkCreate(data: WeatherData[]) {
    // Middleware will automatically sort by timestamp for optimal chunk insertion
    return await db.weatherData.createMany({
      data,
      skipDuplicates: true // Use for time-series data
    });
  }
}
```

### **Standard TimescaleDB Query Patterns**

#### **1. Time-Series Aggregations**
```typescript
// Hourly aggregations with multiple metrics
const hourlyStats = await TimescaleQueries.timeBucket({
  interval: '1 hour',
  table: 'production',
  aggregations: {
    avg: ['power_mw', 'capacity_factor'],
    max: ['power_mw'],
    sum: ['energy_mwh'],
    count: ['*']
  },
  where: 'location_id = ? AND timestamp >= ?',
  groupBy: ['location_id'],
  limit: 24
});
```

#### **2. Recent Data Queries (Leverages Prisma Middleware)**
```typescript
// This query is automatically optimized by middleware
const recentForecasts = await db.forecast.findMany({
  where: { locationId }
  // Middleware adds:
  // - orderBy: { timestamp: 'desc' }
  // - where.timestamp: { gte: 7 days ago }
});
```

#### **3. High-Performance Bulk Operations**
```typescript
// Optimized bulk insert with validation
const result = await TimescaleQueries.bulkInsert('forecasts', data, {
  batchSize: 2000,      // Larger batches for forecasts
  onConflict: 'update', // Update existing records
  validateTimestamps: true
});
```

#### **4. Continuous Aggregates for Dashboards**
```typescript
// Fast dashboard queries using pre-computed views
const dailyProduction = await TimescaleQueries.getProductionDaily(locationId, 30);
const hourlyProduction = await TimescaleQueries.getProductionHourly(locationId, 24);
```

### **Essential Patterns for New Endpoints**

#### **Always Use These Patterns:**
1. **Import the enhanced db client**: `import { db, TimescaleQueries } from '$lib/server/database';`
2. **Leverage automatic optimizations**: Let Prisma middleware optimize your time-series queries
3. **Use TimescaleQueries for complex operations**: Time buckets, bulk inserts, aggregations
4. **Add proper error handling**: Catch and log TimescaleDB-specific errors
5. **Include performance monitoring**: Log slow operations for optimization

#### **Time-Series Table Detection:**
The middleware automatically detects these tables and applies optimizations:
- `forecasts` - Solar production forecasts
- `production` - Actual production data  
- `weather_data` - Meteorological measurements

#### **Example: Complete Weather Data Endpoint**
```typescript
// GET /api/weather/aggregated?location_id=1&interval=1hour&hours=24
export const GET: RequestHandler = async ({ url }) => {
  const locationId = parseInt(url.searchParams.get('location_id') ?? '1');
  const interval = url.searchParams.get('interval') ?? '1 hour';
  const hours = parseInt(url.searchParams.get('hours') ?? '24');

  try {
    const aggregatedData = await TimescaleQueries.timeBucket({
      interval: interval as TimeInterval,
      table: 'weather_data',
      aggregations: {
        avg: ['temperature_c', 'humidity_percent', 'ghi_w_m2', 'dni_w_m2'],
        max: ['ghi_w_m2', 'wind_speed_ms'],
        min: ['temperature_c']
      },
      where: `location_id = ${locationId} AND timestamp >= NOW() - INTERVAL '${hours} hours'`,
      groupBy: ['location_id'],
      limit: hours
    });

    return json({
      success: true,
      data: aggregatedData,
      metadata: {
        locationId,
        interval,
        hours,
        recordCount: aggregatedData.length
      }
    });
  } catch (error) {
    console.error('Weather aggregation error:', error);
    return json({ 
      success: false, 
      error: 'Failed to aggregate weather data' 
    }, { status: 500 });
  }
};
```

### **Performance Best Practices**
1. **Always specify time ranges** to leverage chunk exclusion
2. **Use appropriate aggregation intervals** (15min, 1hour, 1day)
3. **Limit result sets** with reasonable `take` or `limit` values
4. **Batch bulk operations** using `TimescaleQueries.bulkInsert()`
5. **Monitor query performance** through the built-in logging

### **Health Check Integration**
Add health checks for new time-series tables in `/api/timescale/health`:
```typescript
// Add to existing health check endpoint
const customTableStats = await db.$queryRawUnsafe(`
  SELECT COUNT(*) as record_count, 
         MAX(timestamp) as latest_record
  FROM your_new_table 
  WHERE timestamp >= NOW() - INTERVAL '24 hours'
`);
```
