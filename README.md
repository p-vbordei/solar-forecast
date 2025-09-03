# Solar Forecast Platform

A modern solar energy forecasting platform built with SvelteKit, featuring real-time monitoring, ML-powered predictions, and comprehensive analytics.

## 🚀 Features

- **Real-time Dashboard** - Monitor solar production across multiple locations
- **ML-Powered Forecasting** - Advanced prediction models for energy production
- **Location Management** - Manage multiple solar installations
- **Alert System** - Real-time notifications for critical events
- **Analytics & Reports** - Comprehensive performance analysis
- **Dark Theme UI** - Modern, futuristic interface design

## 🛠️ Tech Stack

- **Frontend**: SvelteKit 2.0 + TypeScript
- **Styling**: Tailwind CSS (Dark theme)
- **Backend**: SvelteKit API Routes (CSR Pattern)
- **Database**: PostgreSQL + Prisma ORM
- **ML Microservice**: FastAPI (Python) - ML/Analytics only
- **Architecture**: 
  - **SvelteKit**: Full-stack with Controller/Service/Repository layers
  - **Python Worker**: Microservice for ML predictions and analytics

## 📋 Prerequisites

- Node.js 18+ 
- Python 3.11+
- PostgreSQL 14+
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
# Create PostgreSQL database
createdb solar_forecast

# Run Prisma migrations
npx prisma generate
npx prisma db push
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
│   │   └── ...          # Page routes
│   ├── lib/
│   │   ├── components/  # UI components
│   │   ├── server/      # Server-side code
│   │   │   ├── services/    # Business logic
│   │   │   └── repositories/ # Data access
│   │   └── types/       # TypeScript definitions
│   └── app.css          # Global styles
├── python-worker/       # Python ML microservice
│   ├── app/            # FastAPI application
│   │   ├── modules/    # ML modules (forecast, weather, analysis)
│   │   └── core/       # Core utilities
├── prisma/              # Database schema and migrations
│   └── schema.prisma   # Prisma schema definition
└── ...
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

- ✅ Project setup and configuration
- ✅ Tailwind CSS with dark theme
- ✅ Base layout and navigation
- ✅ Dashboard UI components
- ✅ CSR pattern implementation
- ⏳ Database integration (Prisma)
- ⏳ Python worker services
- ⏳ Authentication system
- ⏳ Real-time WebSocket updates

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