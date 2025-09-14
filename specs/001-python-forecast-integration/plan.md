# Implementation Plan: Python Forecast Service Integration

**Branch**: `001-python-forecast-integration` | **Date**: 2025-01-14 | **Spec**: Database-driven forecast integration
**Input**: Existing solar_forecast_linear models + Python worker + TimescaleDB integration requirements

## Execution Flow (/plan command scope)
```
1. Load feature spec from solar_forecast_linear analysis
   → Integration of production-ready CatBoost models
2. Fill Technical Context (NO CLASSES, pure functions only)
   → Project Type: backend service with ML integration
   → Set Structure Decision: existing Python worker structure
3. Evaluate Constitution Check section below
   → NO CLASSES restriction enforced
   → NO MOCK DATA restriction enforced
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → Analyze database schema mapping requirements
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
6. Re-evaluate Constitution Check section
   → Ensure pure function architecture maintained
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

## Summary
Integrate production-ready solar forecast models from solar_forecast_linear into the Python worker service, replacing mock forecast generation with real CatBoost quantile regression models. System must use TimescaleDB for weather data input and forecast storage, maintaining NO CLASSES architecture with pure functions only.

## Technical Context
**Language/Version**: Python 3.11 (existing Python worker)
**Primary Dependencies**: CatBoost, pvlib-python, pandas, numpy, FastAPI, asyncpg
**Storage**: TimescaleDB (PostgreSQL extension) with Prisma ORM
**Testing**: pytest with async support (existing test framework)
**Target Platform**: Linux server (Railway deployment ready)
**Project Type**: backend service - single project structure
**Performance Goals**: Process 100 locations in <60 seconds, 15-minute resolution forecasts
**Constraints**: <5MB memory per forecast, NO CLASSES allowed, NO MOCK DATA allowed
**Scale/Scope**: 3 production plants initially, scalable to 100+ locations

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (python-worker backend service)
- Using framework directly? YES (FastAPI, no wrapper classes)
- Single data model? YES (TimescaleDB schema, no DTOs)
- Avoiding patterns? YES (no Repository/UoW wrappers, direct SQL)

**Architecture**:
- EVERY feature as library? YES (forecast engine as pure function library)
- Libraries listed:
  - forecast_engine: Core forecasting functions (NO CLASSES)
  - model_loader: Dynamic model loading utilities
  - db_mapper: Database field mapping functions
- CLI per library: N/A (service-based, not CLI)
- Library docs: Functions documented inline for AI context

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? YES (tests must fail first)
- Git commits show tests before implementation? YES (commit pattern enforced)
- Order: Contract→Integration→E2E→Unit strictly followed? YES
- Real dependencies used? YES (actual TimescaleDB, no mocks)
- Integration tests for: forecast generation, database storage, model loading
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:
- Structured logging included? YES (existing structlog setup)
- Frontend logs → backend? N/A (backend service only)
- Error context sufficient? YES (forecast errors, model loading failures)

**Versioning**:
- Version number assigned? 2.0.0 (MAJOR: breaking change from mock to real)
- BUILD increments on every change? YES
- Breaking changes handled? YES (API contract preserved, internal complete rewrite)

## Project Structure

### Documentation (this feature)
```
specs/001-python-forecast-integration/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Existing structure (Option 1: Single project)
python-worker/
├── app/
│   ├── modules/
│   │   ├── forecast/
│   │   │   ├── core/           # NEW: Pure function forecast engine
│   │   │   ├── services.py     # MODIFY: Replace mock with real
│   │   │   ├── repositories.py # MODIFY: Fix database mappings
│   │   │   └── controllers.py  # MODIFY: Add validation
│   │   └── ml_models/
│   │       └── services.py     # MODIFY: Real model loading
│   └── models/                 # NEW: Trained CatBoost models
├── tests/
│   ├── integration/            # NEW: End-to-end forecast tests
│   ├── unit/                   # MODIFY: Real forecast unit tests
│   └── performance/            # NEW: Performance validation
└── pyproject.toml              # MODIFY: Add pvlib dependency
```

**Structure Decision**: Option 1 - existing Python worker structure maintained

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - Database field mapping between solar_forecast_linear and Prisma schema
   - Model file format compatibility and loading patterns
   - Performance requirements for 100+ location scaling
   - TimescaleDB optimization patterns for forecast storage

2. **Generate and dispatch research agents**:
   ```
   Task: "Research database field mapping for forecast storage"
   Task: "Find model loading patterns for CatBoost in async environment"
   Task: "Research TimescaleDB bulk insert optimization patterns"
   Task: "Analyze performance requirements for ML inference scaling"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all database mapping and performance patterns resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - LocationConfig: Database-to-forecast-config mapping
   - ForecastRequest: Input validation and processing
   - ForecastResult: Output with confidence bands (P10-P90)
   - ModelRegistry: Dynamic model loading tracking

2. **Generate API contracts** from functional requirements:
   - POST /api/v1/forecast/generate → Enhanced with real ML
   - GET /api/v1/forecast/task/{id} → Status tracking
   - GET /api/v1/forecast/location/{id} → Results with confidence bands
   - Output OpenAPI schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - test_forecast_generate_real.py (must validate against capacity)
   - test_forecast_confidence_bands.py (P10-P90 validation)
   - test_forecast_database_storage.py (TimescaleDB integration)
   - Tests must fail (no real implementation yet)

4. **Extract test scenarios** from user stories:
   - End-to-end: Weather data → Real forecast → Database storage
   - Performance: 100 locations processed in <60 seconds
   - Validation: All forecasts ≤ plant capacity (CRITICAL)

5. **Update CLAUDE.md incrementally**:
   - Add forecast engine context and NO CLASSES enforcement
   - Add database mapping patterns
   - Add model loading requirements
   - Preserve existing Python worker context

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, updated CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base
- Copy solar_forecast_linear core modules → python-worker/app/modules/forecast/core/
- Update existing services.py to use real forecast engine (NO CLASSES)
- Fix database field mapping in repositories.py
- Add model loading logic to ml_models/services.py
- Create comprehensive tests for real forecast validation

**Ordering Strategy**:
- TDD order: Contract tests → Integration tests → Implementation
- Copy dependencies: Core modules before service modifications
- Model loading: Before forecast generation
- Database: Field mapping before bulk insert optimization

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (copy models, update services, fix database mapping)
**Phase 5**: Validation (test real forecasts, performance validation, capacity constraint validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (NO CLASSES, NO MOCK DATA enforced)
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented (None)

---
*Based on Constitution v2.1.1 - Database-driven forecast integration maintaining pure function architecture*