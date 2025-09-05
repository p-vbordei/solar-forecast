# Solar Forecast Platform

A modern solar energy forecasting platform built with SvelteKit, featuring real-time monitoring, ML-powered predictions, and comprehensive analytics.

## 🚀 Features

- **Real-time Dashboard** - Monitor solar production across multiple locations
- **ML-Powered Forecasting** - Advanced prediction models with confidence bands
- **Location Management** - Manage multiple solar installations with technical specs
- **Alert System** - Multi-severity notifications (INFO, WARNING, CRITICAL, EMERGENCY)
- **Analytics & Reports** - 5 report types with scheduling and distribution
- **Advanced Forecast Visualization** - Interactive ECharts with 15min/hourly/daily/weekly aggregations
- **Dark Theme UI** - Futuristic design (#003135, #024950, #0FA4AF, #AFDDE5)
- **Comprehensive Database** - 16 models covering all solar industry requirements
- **ML Model Management** - Complete model lifecycle tracking and versioning
- **Audit & Compliance** - Full audit logging and API key management

## 🛠️ Tech Stack

- **Frontend**: SvelteKit 2.0 + TypeScript
- **Styling**: Tailwind CSS (Dark theme)
- **Backend**: SvelteKit API Routes (CSR Pattern)
- **Database**: TimescaleDB + Prisma ORM
- **ML Microservice**: FastAPI (Python) - ML/Analytics only
- **Architecture**: 
  - **SvelteKit**: Full-stack with Controller/Service/Repository layers
  - **Python Worker**: Microservice for ML predictions and analytics

## 📋 Prerequisites

- Node.js 18+ 
- Python 3.11+
- TimescaleDB (PostgreSQL 14+ with TimescaleDB extension)
- Redis (optional, for caching)
- UV (Python package manager)

## 🔧 Installation

1. **Clone the repository**
```bash
cd /Users/vladbordei/Documents/Development/solar
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Setup database**
```bash
# Create TimescaleDB database
createdb solar_forecast
# Enable TimescaleDB extension
psql -d solar_forecast -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Run Prisma migrations
npx prisma generate
npx prisma db push

# Initialize TimescaleDB (convert tables to hypertables)
npm run db:migrate-timescale

# Validate TimescaleDB configuration
npm run db:validate-timescale

# Apply production optimizations (optional but recommended)
npm run db:optimize-timescale
```

5. **Setup Python Worker** (in separate terminal)
```bash
cd python-worker
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8001
```

6. **Run SvelteKit development server**
```bash
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Python Worker: `http://localhost:8001`

## 🏗️ Project Structure

```
solar/
├── src/
│   ├── routes/          # SvelteKit routes
│   │   ├── api/         # API endpoints (CSR pattern)
│   │   │   ├── locations/
│   │   │   ├── forecasts/
│   │   │   ├── reports/
│   │   │   └── analysis/
│   │   ├── analysis/    # Forecast visualization page
│   │   ├── reports/     # Reports management page
│   │   └── +page.svelte # Dashboard
│   ├── lib/
│   │   ├── components/  # UI components
│   │   │   ├── dashboard/
│   │   │   ├── analysis/
│   │   │   ├── reports/
│   │   │   └── icons/
│   │   ├── server/      # Server-side code
│   │   │   ├── services/    # Business logic
│   │   │   └── repositories/ # Data access
│   │   └── types/       # TypeScript definitions
│   └── app.css          # Global styles
├── python-worker/       # Python ML microservice
│   ├── app/            # FastAPI application
│   │   ├── modules/    # ML modules
│   │   └── core/       # Core utilities
├── prisma/              # Database schema
│   └── schema.prisma   # 16 comprehensive models
├── docs/
│   └── PRISMA_SCHEMA.md # Database documentation
└── CLAUDE.md           # AI assistant instructions
```

## 🎨 Design System

The platform uses a custom dark theme with the following color palette:

- **Dark Petrol**: `#003135` - Main background
- **Teal Dark**: `#024950` - Secondary background
- **Cyan**: `#0FA4AF` - Primary accent
- **Soft Blue**: `#AFDDE5` - Text color
- **Alert Red**: `#DC2626` - Critical alerts
- **Alert Orange**: `#EA580C` - Warning alerts

## 📡 Architecture

### Correct Architecture:
- **SvelteKit**: Full-stack framework handling all business logic
  - **Controller Layer**: API routes (`src/routes/api/`)
  - **Service Layer**: Business logic (`src/lib/server/services/`)
  - **Repository Layer**: Data access with Prisma (`src/lib/server/repositories/`)
- **Python Worker**: Pure microservice for ML/analytics tasks
  - Forecasting models
  - Weather data processing
  - Performance analytics
  - Model training pipeline

### Data Flow:
1. Client makes request to SvelteKit API
2. Controller validates request
3. Service layer orchestrates business logic
4. Repository layer handles database operations via Prisma
5. Service layer calls Python Worker for ML tasks when needed
6. Response sent back to client

The platform follows the CSR (Controller-Service-Repository) pattern in SvelteKit:

### Controller Layer
Handles HTTP requests and responses
```typescript
// routes/api/locations/+server.ts
export const GET: RequestHandler = async () => {
  const service = new LocationService();
  return json(await service.getLocations());
};
```

### Service Layer
Contains business logic
```typescript
// lib/server/services/location.service.ts
export class LocationService {
  async getLocations() {
    // Business logic here
  }
}
```

### Repository Layer
Handles data access
```typescript
// lib/server/repositories/location.repository.ts
export class LocationRepository {
  async findAll() {
    // Database queries here
  }
}
```

## 🚦 Development Status

### ✅ Completed
- Project setup and configuration
- Tailwind CSS with dark theme (#003135, #024950, #0FA4AF)
- Base layout with sidebar navigation
- Dashboard UI components with real-time metrics
- CSR pattern implementation (Controller/Service/Repository)
- Reports page with 5 report types (Production, Efficiency, Accuracy, Financial, Compliance)
- Advanced forecast analysis page with ECharts visualization
- Interactive charts with confidence bands
- Time aggregation (15min, hourly, daily, weekly)
- Comprehensive Prisma database schema (16 models)
- Industry-standard solar metrics (PR, CF, GHI, DNI, DHI, GTI)
- ML model registry and management
- Audit logging and API key management

### ⏳ In Progress
- Python worker integration
- Real forecast data from ML models
- WebSocket real-time updates

### 🔴 Deferred (Final Phase)
- JWT Authentication system

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run type checking
npm run check
```

## 📦 Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## 🚀 Deployment

The application is configured for deployment on Railway:

```bash
# Deploy to Railway
railway up
```

## 📝 License

Private - All rights reserved

## 👥 Contributors

- Solar Forecast Development Team

## 📞 Support

For support, email support@solarforecast.com

---

**Note**: This is a work in progress. Some features are still being implemented.