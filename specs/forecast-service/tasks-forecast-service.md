# Tasks: Solar Forecast Service

**Input**: Design documents from `/specs/forecast-service/`
**Prerequisites**: plan-forecast-service.md, existing CSR pattern from locations

## Execution Flow (main)
```
1. Load plan-forecast-service.md from feature directory
   → Extract: TypeScript, SvelteKit, Prisma, TimescaleDB
   → Structure: CSR pattern (Controller/Service/Repository)
2. Load design documents:
   → data-model.md: Forecast entities
   → contracts/: API endpoints
   → Existing patterns from locations feature
3. Generate tasks by category:
   → Setup: TypeScript types, interfaces
   → Tests: Contract tests, integration tests
   → Core: Models, services, repositories, controllers
   → UI: Svelte components
   → Integration: API routes, database operations
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T050)
6. Validate task completeness:
   → All endpoints have tests and implementation
   → All components created
   → Python worker integration prepared
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Backend**: `src/lib/features/forecasts/`
- **UI Components**: `src/lib/components/forecasts/`
- **API Routes**: `src/routes/api/forecasts/`
- **Tests**: `tests/` at repository root

## Phase 3.1: Setup & Types
- [ ] T001 [P] Create GenerateForecastRequest type in src/lib/features/forecasts/models/requests/GenerateForecastRequest.ts
- [ ] T002 [P] Create ListForecastsRequest type in src/lib/features/forecasts/models/requests/ListForecastsRequest.ts
- [ ] T003 [P] Create ForecastResponse type in src/lib/features/forecasts/models/responses/ForecastResponse.ts
- [ ] T004 [P] Create ForecastAccuracyResponse type in src/lib/features/forecasts/models/responses/ForecastAccuracyResponse.ts
- [ ] T005 [P] Create ForecastValidator helper in src/lib/features/forecasts/helpers/ForecastValidator.ts
- [ ] T006 [P] Create ForecastTransformer helper in src/lib/features/forecasts/helpers/ForecastTransformer.ts

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests
- [ ] T007 [P] Contract test POST /api/forecasts/generate in tests/contract/forecasts/test_generate_contract.ts
- [ ] T008 [P] Contract test GET /api/forecasts in tests/contract/forecasts/test_list_contract.ts
- [ ] T009 [P] Contract test GET /api/forecasts/[id] in tests/contract/forecasts/test_get_by_id_contract.ts
- [ ] T010 [P] Contract test GET /api/forecasts/accuracy in tests/contract/forecasts/test_accuracy_contract.ts
- [ ] T011 [P] Contract test DELETE /api/forecasts/[id] in tests/contract/forecasts/test_delete_contract.ts

### Integration Tests
- [ ] T012 [P] Integration test forecast generation flow in tests/integration/forecasts/test_forecast_generation.ts
- [ ] T013 [P] Integration test forecast accuracy calculation in tests/integration/forecasts/test_forecast_accuracy.ts
- [ ] T014 [P] Integration test TimescaleDB bulk insert in tests/integration/forecasts/test_timescale_bulk.ts

### Unit Tests
- [ ] T015 [P] Unit test ForecastValidator in tests/unit/forecasts/test_forecast_validator.ts
- [ ] T016 [P] Unit test ForecastTransformer in tests/unit/forecasts/test_forecast_transformer.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Repository Layer
- [ ] T017 Create ForecastRepository in src/lib/features/forecasts/repositories/ForecastRepository.ts
  - Implement create() for new forecast runs
  - Implement findAll() with pagination
  - Implement findById() for specific forecast
  - Implement bulkInsertForecastData() using TimescaleQueries
  - Implement softDelete() for forecast deletion
  - Implement getAccuracyMetrics() for accuracy queries

### Service Layer
- [ ] T018 Create ForecastService in src/lib/features/forecasts/services/ForecastService.ts
  - Implement generateForecast() business logic
  - Implement getAllForecasts() with filtering
  - Implement getForecastById() with validation
  - Implement calculateAccuracy() metrics
  - Implement deleteForecast() with cascade
  - Add Python worker mock call preparation

### Controller Layer
- [ ] T019 Create ForecastController in src/lib/features/forecasts/controllers/ForecastController.ts
  - Implement generateForecast() handler
  - Implement getAllForecasts() handler
  - Implement getForecastById() handler
  - Implement getAccuracyMetrics() handler
  - Implement deleteForecast() handler
  - Add error handling with withErrorHandling

## Phase 3.4: API Routes

- [ ] T020 Create main forecast route handler in src/routes/api/forecasts/+server.ts
  - Implement GET for list forecasts
  - Implement POST for quick forecast creation

- [ ] T021 Create generate endpoint in src/routes/api/forecasts/generate/+server.ts
  - Implement POST for forecast generation
  - Add request validation
  - Return job ID for async processing

- [ ] T022 Create accuracy endpoint in src/routes/api/forecasts/accuracy/+server.ts
  - Implement GET for accuracy metrics
  - Add location and date range filters

- [ ] T023 Create forecast by ID endpoint in src/routes/api/forecasts/[id]/+server.ts
  - Implement GET for specific forecast
  - Implement DELETE for forecast removal

## Phase 3.5: UI Components

- [ ] T024 [P] Create ForecastConfiguration component in src/lib/components/forecasts/ForecastConfiguration.svelte
  - Location dropdown (fetch from /api/locations)
  - Horizon selector (24, 48, 72 hours)
  - Model type selector (ML, Statistical, Hybrid, Ensemble)
  - Generate button with loading state
  - Dark theme styling (#003135, #024950, #0FA4AF, #AFDDE5)

- [ ] T025 [P] Create HorizonSelector component in src/lib/components/forecasts/HorizonSelector.svelte
  - Dropdown with hour options
  - Custom styling matching dark theme
  - Value binding for parent component

- [ ] T026 [P] Create ModelTypeSelector component in src/lib/components/forecasts/ModelTypeSelector.svelte
  - Dropdown with model types from enum
  - Icons for each model type (line-art style)
  - Description tooltips

- [ ] T027 [P] Create ForecastSuccess component in src/lib/components/forecasts/ForecastSuccess.svelte
  - Success message with forecast ID
  - Display accuracy percentage
  - Display confidence percentage
  - Auto-dismiss after 5 seconds
  - Green accent color (#0FA4AF)

## Phase 3.6: Page Integration

- [ ] T028 Create forecasts page in src/routes/forecasts/+page.svelte
  - Import ForecastConfiguration component
  - Import ForecastSuccess component
  - Add state management for form data
  - Handle API calls to generate endpoint
  - Display loading states
  - Show success/error notifications

- [ ] T029 Add forecast navigation item to src/lib/components/Navigation.svelte
  - Add "Forecasts" menu item
  - Use line-art icon (no SVG)
  - Active state highlighting

## Phase 3.7: Database & TimescaleDB Integration

- [ ] T030 Create database migration for forecast tables
  - Add forecast_runs table if needed
  - Ensure hypertable configuration
  - Add indexes for location_id, timestamp

- [ ] T031 Implement TimescaleDB bulk insert optimization
  - Use TimescaleQueries.bulkInsert()
  - Batch size of 1000 records
  - Sort by timestamp before insert

- [ ] T032 Create continuous aggregate for forecast accuracy
  - Hourly accuracy aggregation
  - Daily accuracy aggregation
  - By location and model type

## Phase 3.8: Python Worker Integration Preparation

- [ ] T033 Create Python worker interface in src/lib/features/forecasts/services/PythonWorkerClient.ts
  - HTTP client for FastAPI endpoint
  - Type-safe request/response
  - Error handling and retries
  - Timeout configuration (30 seconds)

- [ ] T034 Create mock Python worker response in src/lib/features/forecasts/mocks/mockForecastData.ts
  - Generate sample forecast data
  - Include confidence intervals (Q10, Q25, Q75, Q90)
  - 15-minute resolution data points
  - Return format matching Python worker

## Phase 3.9: Error Handling & Validation

- [ ] T035 Add input validation for forecast requests
  - Validate location ID exists
  - Validate horizon range (1-168 hours)
  - Validate model type enum
  - Return detailed validation errors

- [ ] T036 Add error handling for Python worker failures
  - Timeout handling
  - Retry logic with exponential backoff
  - Fallback to cached forecasts
  - User-friendly error messages

## Phase 3.10: Performance & Optimization

- [ ] T037 Add caching for forecast queries
  - Cache recent forecasts in memory
  - TTL of 5 minutes
  - Invalidate on new generation

- [ ] T038 Optimize database queries
  - Add appropriate indexes
  - Use Prisma select for minimal fields
  - Implement pagination properly

## Phase 3.11: Monitoring & Logging

- [ ] T039 Add structured logging for forecast operations
  - Log forecast generation requests
  - Log Python worker calls
  - Log accuracy calculations
  - Include timing metrics

- [ ] T040 Add performance monitoring
  - Track generation time
  - Track database query time
  - Track Python worker response time
  - Alert on slow operations (>5s)

## Phase 3.12: Documentation & Polish

- [ ] T041 [P] Update CLAUDE.md with forecast service documentation
- [ ] T042 [P] Create API documentation for forecast endpoints
- [ ] T043 [P] Add JSDoc comments to all functions
- [ ] T044 Run full test suite and fix any failures
- [ ] T045 Performance test with 100 concurrent forecast requests

## Dependencies
- Types (T001-T006) before everything else
- Tests (T007-T016) before implementation
- Repository (T017) before Service (T018)
- Service (T018) before Controller (T019)
- Controller (T019) before Routes (T020-T023)
- Components (T024-T027) can run parallel with backend
- Page (T028-T029) after components
- Database (T030-T032) can run parallel
- Python worker (T033-T034) can run parallel
- Error handling (T035-T036) after core implementation
- Performance (T037-T038) after functional completion
- Monitoring (T039-T040) after core implementation
- Documentation (T041-T043) can run parallel
- Final testing (T044-T045) at the end

## Parallel Execution Examples

### Batch 1: Types and Models (all independent files)
```
Task: "Create GenerateForecastRequest type"
Task: "Create ListForecastsRequest type"
Task: "Create ForecastResponse type"
Task: "Create ForecastAccuracyResponse type"
Task: "Create ForecastValidator helper"
Task: "Create ForecastTransformer helper"
```

### Batch 2: All Tests (must fail first)
```
Task: "Contract test POST /api/forecasts/generate"
Task: "Contract test GET /api/forecasts"
Task: "Contract test GET /api/forecasts/[id]"
Task: "Contract test GET /api/forecasts/accuracy"
Task: "Contract test DELETE /api/forecasts/[id]"
Task: "Integration test forecast generation flow"
Task: "Integration test forecast accuracy calculation"
Task: "Integration test TimescaleDB bulk insert"
Task: "Unit test ForecastValidator"
Task: "Unit test ForecastTransformer"
```

### Batch 3: UI Components (independent)
```
Task: "Create ForecastConfiguration component"
Task: "Create HorizonSelector component"
Task: "Create ModelTypeSelector component"
Task: "Create ForecastSuccess component"
```

## Notes
- All tests MUST be written and MUST FAIL before implementation
- Follow existing CSR pattern from locations feature
- Use existing utilities (ApiResponse, ErrorHandler, TimescaleQueries)
- Maintain dark theme consistency (#003135, #024950, #0FA4AF, #AFDDE5)
- No emojis in UI - only line-art icons
- Python worker integration uses mock data initially
- Commit after each completed task
- Performance target: <500ms for forecast initiation

## Validation Checklist
*GATE: Must be checked before starting implementation*

- [x] All API endpoints have contract tests
- [x] All entities have type definitions
- [x] All tests come before implementation tasks
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No parallel task modifies same file as another [P] task
- [x] CSR pattern (Repository→Service→Controller) order maintained
- [x] UI components can be built independently
- [x] Python worker interface prepared for integration
- [x] TimescaleDB optimizations included

## Task Count Summary
- **Total Tasks**: 45
- **Setup & Types**: 6 tasks
- **Tests**: 10 tasks (must complete first)
- **Core Implementation**: 3 tasks (Repository, Service, Controller)
- **API Routes**: 4 tasks
- **UI Components**: 4 tasks
- **Page Integration**: 2 tasks
- **Database**: 3 tasks
- **Python Worker**: 2 tasks
- **Error & Validation**: 2 tasks
- **Performance**: 2 tasks
- **Monitoring**: 2 tasks
- **Documentation**: 5 tasks

---
*Based on Solar Platform CSR Architecture - Following locations pattern*