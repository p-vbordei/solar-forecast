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
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL + TimescaleDB
- **Architecture**: CSR Pattern (Controller-Service-Repository)

## 📋 Prerequisites

- Node.js 18+ 
- Python 3.11+
- PostgreSQL 14+
- Redis (for caching)

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

# Install TimescaleDB extension
psql -d solar_forecast -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

5. **Run development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

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
├── python-worker/       # Python backend (to be implemented)
├── prisma/              # Database schema (to be implemented)
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

## 📡 API Architecture

The platform follows the CSR (Controller-Service-Repository) pattern:

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