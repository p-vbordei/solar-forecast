# Implementation Plan: Solar Forecast Service

**Branch**: `feature/forecast-service` | **Date**: 2025-09-14 | **Spec**: Image screenshot + CLAUDE.md requirements
**Input**: Feature specification from user request for forecast generation interface

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Image shows forecast configuration UI with dropdowns
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Project Type: Web (SvelteKit full-stack)
   → Structure Decision: Existing CSR pattern
3. Evaluate Constitution Check section below
   → Using existing patterns from locations feature
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → CSR pattern already established
5. Execute Phase 1 → contracts, data-model.md, quickstart.md
6. Re-evaluate Constitution Check section
   → Maintain consistency with existing architecture
7. Plan Phase 2 → Task generation approach
8. STOP - Ready for implementation
```

## Summary
Implementation of a solar forecast generation service with UI configuration interface, following the existing CSR (Controller-Service-Repository) pattern established in the locations feature. The service will generate forecasts for solar plants with configurable parameters (location, horizon, model type) and integrate with a Python worker for ML processing.

## Technical Context
**Language/Version**: TypeScript 5.x, Python 3.11
**Primary Dependencies**: SvelteKit, Prisma ORM, TimescaleDB, FastAPI
**Storage**: TimescaleDB (PostgreSQL with time-series extension)
**Testing**: Vitest for frontend, pytest for Python worker
**Target Platform**: Web application (Railway deployment)
**Project Type**: Web - SvelteKit full-stack with Python microservice
**Performance Goals**: <500ms forecast generation initiation, bulk insert 1000 records/sec
**Constraints**: 10 concurrent users, 100 locations, 5 clients
**Scale/Scope**: Time-series data for 100 locations, 15-min resolution

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 2 (SvelteKit app, Python worker)
- Using framework directly? Yes - Prisma, SvelteKit, FastAPI
- Single data model? Yes - Prisma schema shared
- Avoiding patterns? No - Using established CSR pattern

**Architecture**:
- EVERY feature as library? Yes - features folder structure
- Libraries listed:
  - forecasts (forecast generation and management)
  - components/forecasts (UI components)
- CLI per library: N/A (web application)
- Library docs: TypeScript interfaces and JSDoc

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Will enforce
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes - Real TimescaleDB
- Integration tests for: forecast generation, API endpoints, database operations
- FORBIDDEN: Implementation before test - will follow TDD

**Observability**:
- Structured logging included? Yes - existing ErrorHandler
- Frontend logs → backend? Yes - via API
- Error context sufficient? Yes - withErrorHandling wrapper

**Versioning**:
- Version number assigned? Using existing app version
- BUILD increments on every change? Git commit based
- Breaking changes handled? N/A - new feature

## Project Structure

### Documentation (this feature)
```
specs/forecast-service/
├── plan-forecast-service.md     # This file
├── research.md                  # CSR pattern research (existing)
├── data-model.md                # Forecast entities
├── quickstart.md                # How to use forecast service
├── contracts/                   # API contracts
│   ├── forecast-generate.yaml   # POST /api/forecasts/generate
│   ├── forecast-list.yaml       # GET /api/forecasts
│   └── forecast-accuracy.yaml   # GET /api/forecasts/accuracy
└── tasks-forecast-service.md    # Implementation tasks
```

### Source Code (repository root)
```
src/
├── lib/
│   ├── features/
│   │   └── forecasts/           # NEW FEATURE
│   │       ├── controllers/
│   │       │   └── ForecastController.ts
│   │       ├── services/
│   │       │   └── ForecastService.ts
│   │       ├── repositories/
│   │       │   └── ForecastRepository.ts
│   │       ├── models/
│   │       │   ├── requests/
│   │       │   │   ├── GenerateForecastRequest.ts
│   │       │   │   └── ListForecastsRequest.ts
│   │       │   └── responses/
│   │       │       ├── ForecastResponse.ts
│   │       │       └── ForecastAccuracyResponse.ts
│   │       └── helpers/
│   │           ├── ForecastValidator.ts
│   │           └── ForecastTransformer.ts
│   └── components/
│       └── forecasts/           # NEW UI COMPONENTS
│           ├── ForecastConfiguration.svelte
│           ├── ForecastSuccess.svelte
│           ├── HorizonSelector.svelte
│           └── ModelTypeSelector.svelte
├── routes/
│   ├── api/
│   │   └── forecasts/           # NEW API ROUTES
│   │       ├── +server.ts       # GET, POST
│   │       ├── generate/
│   │       │   └── +server.ts   # POST generate
│   │       ├── accuracy/
│   │       │   └── +server.ts   # GET accuracy
│   │       └── [id]/
│   │           └── +server.ts   # GET, DELETE by ID
│   └── forecasts/               # NEW UI PAGE
│       └── +page.svelte

tests/
├── integration/
│   └── forecasts/
│       ├── test_forecast_generation.ts
│       └── test_forecast_accuracy.ts
└── unit/
    └── forecasts/
        ├── test_forecast_validator.ts
        └── test_forecast_transformer.ts

python-worker/                   # EXISTING
└── app/
    └── services/
        └── forecast_service.py   # ML forecast generation
```

**Structure Decision**: Web application (Option 2) - Following existing SvelteKit + Python worker pattern

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context**:
   - CSR pattern implementation ✓ (already researched in locations)
   - TimescaleDB bulk insert patterns ✓ (existing helpers)
   - Python worker communication pattern ✓ (HTTP via FastAPI)

2. **Research findings** (from existing codebase):
   - Decision: CSR pattern with separate Controller/Service/Repository
   - Rationale: Clean separation of concerns, testable
   - Alternatives considered: Direct Prisma in routes (rejected for maintainability)

3. **Consolidate findings** in existing patterns:
   - Use ApiResponse utility for standardized responses
   - Use ErrorHandler with withErrorHandling wrapper
   - Use TimescaleQueries helper for bulk operations

**Output**: Research complete - using established patterns

## Phase 1: Design & Contracts

1. **Extract entities from feature spec** → `data-model.md`:
   - ForecastRun: Tracking each generation request
   - ForecastData: Time-series forecast values
   - ForecastAccuracy: Accuracy metrics per run
   - ModelConfiguration: Model parameters used

2. **Generate API contracts**:
   - POST /api/forecasts/generate - Initiate forecast
   - GET /api/forecasts - List forecast runs
   - GET /api/forecasts/[id] - Get specific forecast
   - GET /api/forecasts/accuracy - Get accuracy metrics
   - DELETE /api/forecasts/[id] - Delete forecast run

3. **Generate contract tests**:
   - test_forecast_generate_contract.ts
   - test_forecast_list_contract.ts
   - test_forecast_accuracy_contract.ts

4. **Extract test scenarios**:
   - User selects location and generates forecast
   - System shows success with accuracy/confidence
   - User views historical forecasts
   - System calculates accuracy metrics

5. **Update CLAUDE.md incrementally**:
   - Add forecast service documentation
   - Include API endpoints
   - Document Python worker integration

**Output**: Contracts, data model, test scenarios

## Phase 2: Task Planning Approach

**Task Generation Strategy**:
- Generate tasks from contracts (5 contract test tasks)
- Entity tasks (4 model/type tasks)
- Service layer tasks (3 service tasks)
- Repository tasks (2 repository tasks)
- Controller tasks (2 controller tasks)
- UI component tasks (4 component tasks)
- Integration tasks (3 integration tasks)
- API route tasks (4 route tasks)
- Python worker prep tasks (2 mock tasks)

**Ordering Strategy**:
- Types/Models first [P]
- Repository → Service → Controller
- Tests before implementation
- UI components [P]
- Integration last

**Estimated Output**: 35-40 numbered tasks in tasks-forecast-service.md

## Phase 3+: Future Implementation

**Phase 3**: Task execution (create tasks-forecast-service.md)
**Phase 4**: Implementation following TDD
**Phase 5**: Integration with Python worker

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| CSR Pattern | Consistency with existing codebase | Direct Prisma calls would break established patterns |
| 2 Projects | Python ML processing | JavaScript ML libraries insufficient for solar forecasting |

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (using existing patterns)
- [x] Phase 1: Design complete (contracts defined)
- [x] Phase 2: Task planning complete (strategy defined)
- [ ] Phase 3: Tasks generated
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Solar Platform Architecture v1.0 - See `/CLAUDE.md`*