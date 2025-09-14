# Implementation Plan: Python Worker Weather Database Integration

**Branch**: `feature/python-weather-db` | **Date**: 2025-09-14 | **Spec**: Weather Data from Database
**Input**: Feature specification for Python worker to read weather data from TimescaleDB instead of API calls

## Execution Flow
```
1. Load feature requirements from analysis
   → Python worker reads weather from database (populated by SvelteKit)
   → Fallback mechanism to trigger SvelteKit sync when data is stale
   → Remove direct API calls from Python worker
2. Fill Technical Context
   → Project Type: Microservice (Python FastAPI worker)
   → Structure Decision: Feature modules under /app/modules
3. Evaluate Constitution Check
   → Follows existing repository pattern ✓
   → Uses established database connection ✓
   → Maintains consistency with codebase ✓
4. Execute Phase 0 → research complete (TimescaleDB schema analyzed)
5. Execute Phase 1 → contracts, data-model, integration patterns
6. Re-evaluate Constitution Check → All passing
7. Plan Phase 2 → Task generation approach defined
8. STOP - Ready for tasks implementation
```

## Summary
Modify the Python worker to read weather data from TimescaleDB (populated by SvelteKit from Open-Meteo) instead of making direct API calls. Implement a database-first approach with fallback mechanism to trigger SvelteKit weather sync when data is missing or stale (>15 minutes old).

## Technical Context
**Language/Version**: Python 3.11 / FastAPI
**Primary Dependencies**: SQLAlchemy, asyncpg, httpx, numpy
**Storage**: TimescaleDB (PostgreSQL extension) - WeatherData hypertable
**Testing**: pytest for unit/integration tests
**Target Platform**: Microservice (Python FastAPI worker)
**Project Type**: single - Python microservice
**Performance Goals**: <100ms weather query response, batch processing support
**Constraints**: 15-minute weather freshness requirement, compatibility with Prisma schema
**Scale/Scope**: 100 locations × 96 records/day (15-min intervals)

## Constitution Check
*GATE: Must pass before implementation*

**Simplicity**:
- Projects: 1 (Python worker microservice) ✓
- Using framework directly? Yes (FastAPI, SQLAlchemy) ✓
- Single data model? Yes (WeatherData matching Prisma) ✓
- Avoiding patterns? Using established repository pattern ✓

**Architecture**:
- Feature as module? Yes (/app/modules/weather) ✓
- Libraries: httpx (SvelteKit integration), database helpers ✓
- Follows existing patterns: Repository/Service structure ✓
- Consistent with codebase: Yes ✓

**Testing**:
- TDD approach planned ✓
- Integration tests for database queries ✓
- Repository tests with real TimescaleDB ✓
- Service tests for freshness logic ✓

**Observability**:
- Structured logging via existing patterns ✓
- Performance monitoring for queries ✓
- Error context for sync failures ✓

**Versioning**:
- Using existing system versioning ✓
- Database compatibility with Prisma schema ✓
- API versioning through routes ✓

## Project Structure

### Documentation (this feature)
```
python-worker-weather-db/
├── python-worker-weather-db-plan.md    # This file
├── python-worker-weather-db-tasks.md   # Detailed tasks
└── logs.md                              # Implementation notes
```

### Source Code (feature module)
```
python-worker/
├── app/
│   ├── models/
│   │   └── weather.py                  # SQLAlchemy weather model
│   ├── modules/weather/
│   │   ├── repositories.py             # Weather database access
│   │   ├── services.py                 # Weather business logic (refactored)
│   │   └── controllers.py              # Weather API endpoints (enhanced)
│   ├── core/
│   │   └── config.py                   # Configuration updates
│   └── integrations/
│       └── sveltekit.py                # SvelteKit API client
└── tests/
    ├── integration/
    │   └── test_weather_db.py          # Database integration tests
    └── unit/
        └── test_weather_service.py     # Service unit tests
```

**Structure Decision**: Feature module following existing patterns

## Phase 0: Research & Analysis
1. **TimescaleDB Schema Analysis** ✓
   - WeatherData table structure understood
   - Prisma column naming conventions identified
   - Time-series optimization patterns reviewed

2. **Python Worker Architecture** ✓
   - Existing repository pattern confirmed
   - AsyncSession database connection available
   - Service/Controller separation established

3. **SvelteKit Integration** ✓
   - Weather sync endpoints identified
   - API structure documented
   - Authentication requirements: None (internal service)

**Output**: Research complete, all patterns understood

## Phase 1: Design & Contracts

1. **Data Model** (matching Prisma schema):
   ```python
   # SQLAlchemy model matching Prisma WeatherData
   class WeatherData:
       id: String (UUID)
       timestamp: DateTime
       locationId: String (UUID)
       temperature: Float
       humidity: Float
       pressure: Float
       windSpeed: Float (camelCase in DB)
       cloudCover: Float (camelCase in DB)
       ghi: Float  # Global Horizontal Irradiance
       dni: Float  # Direct Normal Irradiance
       dhi: Float  # Diffuse Horizontal Irradiance
   ```

2. **Repository Contracts**:
   - `get_recent_weather(location_id, hours)` → List[WeatherData]
   - `get_weather_range(location_id, start_time, end_time)` → List[WeatherData]
   - `get_latest_weather(location_id)` → Optional[WeatherData]
   - `check_data_freshness(location_id, max_age_minutes)` → bool

3. **Service Contracts**:
   - `get_forecast(latitude, longitude, days)` → List[Dict] (refactored)
   - `get_weather_with_freshness(location_id, max_age_minutes)` → WeatherData
   - `trigger_weather_sync(location_id)` → bool

4. **Controller Contracts**:
   ```python
   GET /weather/current/{location_id}
   POST /weather/refresh/{location_id}
   GET /weather/status/{location_id}
   ```

**Output**: Contracts defined, data model ready

## Phase 2: Task Planning Approach

**Task Generation Strategy**:
- Setup tasks: Models, configuration
- Repository tasks: Database queries with raw SQL
- Service tasks: Refactor to use repository, add freshness logic
- Integration tasks: SvelteKit client, sync mechanism
- Controller tasks: New endpoints for weather status
- Test tasks: Integration and unit tests

**Ordering Strategy**:
- Models → Repository → Service → Controllers → Tests
- Repository and models can be parallel [P]
- Service depends on repository completion

**Estimated Output**: 20-25 tasks covering full implementation

## Phase 3+: Future Implementation
**Phase 3**: Task execution (see python-worker-weather-db-tasks.md)
**Phase 4**: Implementation following tasks
**Phase 5**: Validation and testing

## Complexity Tracking
| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | Following existing patterns | N/A |

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete
- [x] Phase 1: Design complete
- [x] Phase 2: Task planning complete
- [ ] Phase 3: Tasks ready for execution
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All clarifications resolved
- [x] Complexity deviations documented (none)

---
*Based on Solar Forecast Platform architecture and Python worker patterns*