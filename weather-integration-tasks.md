# Tasks: Weather Data Integration

**Input**: Design documents from weather-integration-plan.md
**Prerequisites**: plan.md (complete), Open-Meteo API research, existing WeatherData model

## Execution Flow
```
1. Load plan from weather-integration-plan.md
   → Tech stack: SvelteKit, TypeScript, Prisma, TimescaleDB
   → Structure: Feature module at /lib/features/weather
2. Design documents loaded:
   → Data model: WeatherData (existing in Prisma)
   → API contracts: 4 endpoints defined
   → Integration: Open-Meteo API client
3. Generate tasks by category:
   → Setup: Feature structure, types
   → Tests: Controller, Service, Repository, Integration
   → Core: Implementation following TDD
   → Integration: Open-Meteo, TimescaleDB
   → Polish: Error handling, logging, docs
4. Apply task rules:
   → [P] for parallel tasks (different files)
   → Tests before implementation (TDD)
   → Follow CSR pattern from Locations
5. Number tasks T001-T040
6. Validate completeness:
   → All endpoints have tests ✓
   → All layers implemented ✓
   → Integration complete ✓
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Exact file paths included

## Path Conventions
- **Routes**: `src/routes/api/weather/`
- **Feature**: `src/lib/features/weather/`
- **Integration**: `src/lib/integrations/`
- **Tests**: Inline with implementation files (*.test.ts)

## Phase 3.1: Setup & Structure
- [ ] T001 Create weather feature directory structure at src/lib/features/weather/
- [ ] T002 [P] Create TypeScript interfaces in src/lib/features/weather/models/dto/weather.ts
- [ ] T003 [P] Create request models in src/lib/features/weather/models/requests/
- [ ] T004 [P] Create weather transformer helper in src/lib/features/weather/helpers/WeatherDataTransformer.ts
- [ ] T005 [P] Set up Open-Meteo client structure in src/lib/integrations/open-meteo/

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Controller Tests
- [ ] T006 [P] Test GET /api/weather endpoint in src/lib/features/weather/controllers/WeatherController.test.ts
- [ ] T007 [P] Test GET /api/weather/forecast endpoint validation
- [ ] T008 [P] Test POST /api/weather/sync endpoint authorization
- [ ] T009 [P] Test GET /api/weather/[id] endpoint with GUID validation

### Service Tests
- [ ] T010 [P] Test WeatherService.getCurrentWeather() in src/lib/features/weather/services/WeatherService.test.ts
- [ ] T011 [P] Test WeatherService.getForecast() with multiple days
- [ ] T012 [P] Test WeatherService.syncAllLocations() batch processing
- [ ] T013 [P] Test WeatherService error handling for invalid locations

### Repository Tests
- [ ] T014 [P] Test WeatherRepository.bulkInsert() in src/lib/features/weather/repositories/WeatherRepository.test.ts
- [ ] T015 [P] Test WeatherRepository.findByLocation() with time ranges
- [ ] T016 [P] Test WeatherRepository.aggregateByInterval() for time-buckets
- [ ] T017 [P] Test WeatherRepository deduplication logic

### Integration Tests
- [ ] T018 [P] Test OpenMeteoClient.getCurrentWeather() in src/lib/integrations/open-meteo/OpenMeteoClient.test.ts
- [ ] T019 [P] Test OpenMeteoClient.getForecast() response parsing
- [ ] T020 [P] Test WeatherDataTransformer.transform() mapping logic
- [ ] T021 [P] Test end-to-end weather sync flow

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Repository Layer
- [ ] T022 Implement WeatherRepository in src/lib/features/weather/repositories/WeatherRepository.ts
- [ ] T023 Add TimescaleDB bulk insert using existing helpers
- [ ] T024 Implement time-series query methods
- [ ] T025 Add data quality validation

### Service Layer
- [ ] T026 Implement WeatherService in src/lib/features/weather/services/WeatherService.ts
- [ ] T027 Add location coordinate fetching from LocationsRepository
- [ ] T028 Implement batch processing for multiple locations
- [ ] T029 Add caching strategy for API rate limiting

### Controller Layer
- [ ] T030 Implement WeatherController in src/lib/features/weather/controllers/WeatherController.ts
- [ ] T031 Add request validation using existing patterns
- [ ] T032 Implement error handling with ApiResponse utility
- [ ] T033 Add pagination support for forecast endpoint

### API Routes
- [ ] T034 Create main weather route in src/routes/api/weather/+server.ts
- [ ] T035 Create weather by ID route in src/routes/api/weather/[id]/+server.ts
- [ ] T036 Wire up controller methods to route handlers

## Phase 3.4: Integration Components

### Open-Meteo Integration
- [ ] T037 Implement OpenMeteoClient in src/lib/integrations/open-meteo/OpenMeteoClient.ts
- [ ] T038 Add request parameter builders for weather and solar data
- [ ] T039 Implement response parsing and error handling
- [ ] T040 Add retry logic with exponential backoff

### Data Transformation
- [ ] T041 Implement WeatherDataTransformer.transform() method
- [ ] T042 Map Open-Meteo fields to WeatherData model
- [ ] T043 Add timezone conversion handling
- [ ] T044 Implement data quality scoring

### Scheduled Jobs
- [ ] T045 Create weather sync job in src/lib/server/jobs/weather-sync.ts
- [ ] T046 Implement 15-minute cron schedule
- [ ] T047 Add error recovery and logging
- [ ] T048 Implement batch processing optimization

## Phase 3.5: Polish & Documentation

### Error Handling & Logging
- [ ] T049 Add structured logging to all components
- [ ] T050 Implement custom weather-specific errors
- [ ] T051 Add performance monitoring for API calls
- [ ] T052 Create health check endpoint

### Documentation
- [ ] T053 [P] Create API documentation in docs/api/weather.md
- [ ] T054 [P] Update CLAUDE.md with weather integration patterns
- [ ] T055 [P] Create logs.md with implementation notes
- [ ] T056 [P] Add inline JSDoc comments

### Performance & Optimization
- [ ] T057 Optimize batch insert performance
- [ ] T058 Add database indexes for common queries
- [ ] T059 Implement connection pooling for API calls
- [ ] T060 Add response caching headers

## Dependencies
- Setup (T001-T005) must complete first
- Tests (T006-T021) before implementation (T022-T048)
- Repository (T022-T025) blocks Service (T026-T029)
- Service blocks Controller (T030-T033)
- Controller blocks Routes (T034-T036)
- Integration (T037-T044) can run parallel to core
- Polish (T049-T060) after all implementation

## Parallel Execution Examples
```
# Launch test writing in parallel:
Task: "Test GET /api/weather endpoint"
Task: "Test WeatherService.getCurrentWeather()"
Task: "Test WeatherRepository.bulkInsert()"
Task: "Test OpenMeteoClient.getCurrentWeather()"

# Launch documentation in parallel:
Task: "Create API documentation in docs/api/weather.md"
Task: "Update CLAUDE.md with weather patterns"
Task: "Create logs.md with implementation notes"
```

## Notes
- Follow existing CSR pattern from Locations feature
- Use GUIDs (strings) for all IDs, not integers
- Leverage existing utilities: ApiResponse, ErrorHandler, TimescaleQueries
- Maintain consistency with established codebase patterns
- Tests must fail before implementation (TDD)
- Commit after each completed task

## Validation Checklist
- [x] All API endpoints have controller tests
- [x] All service methods have tests
- [x] All repository operations have tests
- [x] Integration tests for Open-Meteo client
- [x] Tests come before implementation
- [x] Parallel tasks are truly independent
- [x] Each task specifies exact file path
- [x] No parallel tasks modify same file

## Estimated Time
- Setup: 30 minutes
- Tests: 2 hours
- Implementation: 3 hours
- Integration: 1.5 hours
- Polish: 1 hour
- **Total**: ~7.5 hours

---
*Tasks generated from weather-integration-plan.md following TDD principles*