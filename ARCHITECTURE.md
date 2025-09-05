# Solar Forecast Platform - Architecture Documentation

## System Overview

The Solar Forecast Platform is a modern, microservices-based application for solar energy forecasting and monitoring. It follows a clean architecture pattern with clear separation of concerns between the main application logic and ML/analytics services.

## Architecture Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                        │
│                    SvelteKit Frontend (Port 5173)               │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│                    SVELTEKIT BACKEND (Port 5173)                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   API Routes (Controllers)                │  │
│  │               /api/locations, /api/forecasts              │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│  ┌────────────────────────▼─────────────────────────────────┐  │
│  │                    Service Layer                          │  │
│  │          Business Logic & External Service Calls          │  │
│  └──────────┬──────────────────────┬────────────────────────┘  │
│  ┌──────────▼──────────┐  ┌───────▼────────┐                  │
│  │   Repository Layer   │  │  Python Worker  │                  │
│  │    (Prisma ORM)      │  │   HTTP Calls    │                  │
│  └──────────┬───────────┘  └───────┬────────┘                  │
└─────────────┼───────────────────────┼───────────────────────────┘
              │                       │ HTTP (Port 8001)
┌─────────────▼───────────┐  ┌───────▼────────────────────────────┐
│   TimescaleDB Database  │  │   Python Worker Microservice       │
│     (Port 5432)         │  │        (FastAPI - Port 8001)       │
│  ┌──────────────────┐   │  │  ┌─────────────────────────────┐  │
│  │ Tables:          │   │  │  │ ML Modules:                 │  │
│  │ - Users          │   │  │  │ - Forecast (LSTM/Prophet)   │  │
│  │ - Locations      │   │  │  │ - Weather (OpenWeather API) │  │
│  │ - Forecasts      │   │  │  │ - Analysis (Performance)    │  │
│  │ - Production     │   │  │  │ - Pipeline (Training)       │  │
│  │ - Alerts         │   │  │  └─────────────────────────────┘  │
│  │ - WeatherData    │   │  └────────────────────────────────────┘
│  └──────────────────┘   │
└─────────────────────────┘
```

## Layer Responsibilities

### 1. SvelteKit Application (Main Backend + Frontend)

#### Controller Layer (`src/routes/api/`)
- **Purpose**: Handle HTTP requests and responses
- **Location**: `src/routes/api/[resource]/+server.ts`
- **Responsibilities**:
  - Request validation
  - HTTP response formatting
  - Error handling
  - Authentication/Authorization (when implemented)

Example Controller:
```typescript
// src/routes/api/locations/+server.ts
export async function GET({ url }) {
    const service = new LocationService(new LocationRepository());
    const locations = await service.getLocations(filters);
    return json(locations);
}
```

#### Service Layer (`src/lib/server/services/`)
- **Purpose**: Business logic and orchestration
- **Location**: `src/lib/server/services/*.service.ts`
- **Responsibilities**:
  - Business rules implementation
  - Orchestrating between repository and external services
  - Calling Python worker for ML tasks
  - Data transformation and enrichment

Example Service:
```typescript
// src/lib/server/services/location.service.ts
class LocationService {
    async getLocationWithForecast(id: number) {
        // Get data from repository
        const location = await this.repository.findById(id);
        
        // Call Python worker for ML predictions
        const forecast = await this.getForecast(id);
        
        // Combine and return
        return { ...location, forecast };
    }
}
```

#### Repository Layer (`src/lib/server/repositories/`)
- **Purpose**: Data access and persistence
- **Location**: `src/lib/server/repositories/*.repository.ts`
- **Technology**: Prisma ORM
- **Responsibilities**:
  - Database queries
  - Data persistence
  - Query optimization
  - Transaction management

Example Repository:
```typescript
// src/lib/server/repositories/location.repository.ts
class LocationRepository {
    async findAll(filter?: LocationFilter) {
        return await db.location.findMany({
            where: filter,
            include: { client: true }
        });
    }
}
```

### 2. Python Worker Microservice

#### Purpose
Pure microservice for ML and analytics tasks. It does NOT handle business logic or database operations directly.

#### Modules
- **Forecast Module** (`app/modules/forecast/`)
  - LSTM models for time-series prediction
  - Prophet model integration
  - Ensemble forecasting
  
- **Weather Module** (`app/modules/weather/`)
  - OpenWeather API integration
  - Weather data processing
  - Solar irradiance calculations
  
- **Analysis Module** (`app/modules/analysis/`)
  - Performance metrics calculation
  - Anomaly detection
  - Efficiency analysis
  
- **Pipeline Module** (`app/modules/pipeline/`)
  - Model training workflows
  - Data preprocessing
  - Model evaluation

#### Communication
- Receives HTTP requests from SvelteKit services
- Returns JSON responses with predictions/analytics
- Does not directly access the database
- Stateless operations

### 3. Database (TimescaleDB with Prisma)

#### Schema Management
- **Prisma Schema**: `prisma/schema.prisma`
- **Migrations**: Managed by Prisma
- **Client Generation**: `npx prisma generate`

#### Key Tables
- **Location**: Solar installation sites
- **Forecast**: ML predictions (time-series)
- **Production**: Actual production data (time-series)
- **WeatherData**: Weather observations (time-series)
- **Alert**: System notifications
- **User**: User accounts (authentication deferred)

## Data Flow Examples

### Example 1: Getting Location with Forecast

1. **Client Request**: `GET /api/locations/1`
2. **Controller**: Routes request to LocationService
3. **Service**: 
   - Calls Repository for location data
   - Calls Python Worker for forecast
   - Combines results
4. **Repository**: Queries TimescaleDB via Prisma
5. **Python Worker**: Generates ML prediction
6. **Response**: Combined data returned to client

### Example 2: Creating New Location

1. **Client Request**: `POST /api/locations`
2. **Controller**: Validates request body
3. **Service**:
   - Validates business rules
   - Creates location via Repository
   - Initializes ML model in Python Worker
4. **Repository**: Inserts into TimescaleDB
5. **Python Worker**: Prepares model for new location
6. **Response**: Created location returned

## Environment Configuration

### SvelteKit Application (.env)
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/solar_forecast"
PYTHON_WORKER_URL="http://localhost:8001"
NODE_ENV="development"
```

### Python Worker (.env)
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/solar_forecast"
OPENWEATHER_API_KEY="your_api_key"
PORT=8001
```

## Development Workflow

### Starting the System

1. **Database**:
```bash
# Ensure TimescaleDB is running (PostgreSQL with TimescaleDB extension)
psql -U postgres -c "CREATE DATABASE solar_forecast;" 2>/dev/null || true
```

2. **SvelteKit Application**:
```bash
cd /Users/vladbordei/Documents/Development/solar
npm install
npx prisma generate
npx prisma db push
npm run dev
```

3. **Python Worker**:
```bash
cd /Users/vladbordei/Documents/Development/solar/python-worker
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## API Endpoints

### SvelteKit API Routes

#### Locations
- `GET /api/locations` - List all locations
- `GET /api/locations/[id]` - Get location details with forecast
- `POST /api/locations` - Create new location
- `PUT /api/locations/[id]` - Update location
- `DELETE /api/locations/[id]` - Soft delete location

#### Forecasts
- `GET /api/forecasts/[locationId]` - Get forecasts for location
- `POST /api/forecasts/generate` - Generate new forecast

#### Analytics
- `GET /api/analytics/performance` - Performance metrics
- `GET /api/analytics/dashboard` - Dashboard aggregations

### Python Worker Endpoints

#### ML/Analytics
- `POST /api/v1/forecast/location/{id}` - Generate forecast
- `POST /api/v1/weather/current` - Get weather data
- `POST /api/v1/analysis/performance` - Analyze performance
- `POST /api/v1/pipeline/retrain` - Retrain models

## Security Considerations

1. **Authentication**: JWT-based (deferred to final phase)
2. **Input Validation**: At controller and service layers
3. **SQL Injection**: Protected by Prisma ORM
4. **CORS**: Configured in both applications
5. **Environment Variables**: Sensitive data in .env files

## Performance Optimizations

1. **Database**:
   - Indexed queries via Prisma
   - Connection pooling
   - Query result caching

2. **Python Worker**:
   - Model caching
   - Async request handling
   - Batch predictions

3. **Frontend**:
   - SSR/CSR optimization
   - Lazy loading
   - WebSocket for real-time updates (planned)

## Testing Strategy

### Unit Tests
- Service layer business logic
- Repository queries
- ML model predictions

### Integration Tests
- API endpoint testing
- Database operations
- Service-to-microservice communication

### E2E Tests
- Complete user workflows
- Cross-service transactions

## Deployment Architecture (Production)

### Recommended Setup
- **SvelteKit**: Vercel/Netlify or containerized
- **Python Worker**: Docker container on Railway/Fly.io
- **Database**: Railway TimescaleDB (PostgreSQL + TimescaleDB extension)
- **Redis**: Railway Redis (for caching)

### Scaling Considerations
- Horizontal scaling for Python Worker
- Database read replicas
- CDN for static assets
- Load balancing for API routes

## Monitoring & Logging

### Application Metrics
- Request/response times
- Error rates
- Database query performance
- ML model accuracy

### Logging
- Structured logging (JSON format)
- Centralized log aggregation
- Error tracking (Sentry integration planned)

## Future Enhancements

1. **Phase 3** (Planned):
   - WebSocket real-time updates
   - Advanced ML model integration
   - Automated report generation

2. **Phase 4** (Deferred):
   - JWT authentication system
   - Multi-tenancy support
   - API rate limiting

## Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Check TimescaleDB is running
   - Verify DATABASE_URL in .env
   - Run `npx prisma db push`

2. **Python Worker Not Responding**:
   - Check port 8001 is free
   - Verify dependencies: `uv sync`
   - Check PYTHON_WORKER_URL in .env

3. **Prisma Client Errors**:
   - Regenerate client: `npx prisma generate`
   - Check schema sync: `npx prisma db push`

## Conclusion

This architecture provides:
- Clear separation of concerns
- Scalable microservices design
- Type-safe database access
- Maintainable code structure
- Easy testing and debugging

The CSR pattern in SvelteKit ensures business logic stays in the appropriate layer, while the Python worker handles specialized ML tasks efficiently.