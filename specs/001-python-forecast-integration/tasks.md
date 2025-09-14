# Tasks: Python Forecast Service Integration

**Input**: Design documents from `/specs/001-python-forecast-integration/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: Python 3.11, CatBoost, pvlib, TimescaleDB, NO CLASSES
   → Structure: Existing python-worker backend service
2. Load optional design documents:
   → data-model.md: LocationConfig, ForecastResult, ModelRegistry
   → contracts/: Forecast API endpoints with confidence bands
   → research.md: Database mapping and model loading patterns
3. Generate tasks by category:
   → Setup: Dependencies, model files, directory structure
   → Tests: Contract tests for real forecasts, database integration
   → Core: Pure function forecast engine, model loading, database mapping
   → Integration: Service layer updates, repository fixes
   → Polish: Performance validation, capacity constraint tests
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD - CRITICAL)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Backend service**: `python-worker/app/`, `python-worker/tests/`
- All paths relative to repository root

## Phase 3.1: Setup & Dependencies
- [ ] T001 Add pvlib-python>=0.11.1 to python-worker/pyproject.toml dependencies
- [ ] T002 [P] Create python-worker/app/modules/forecast/core/ directory structure
- [ ] T003 [P] Create python-worker/models/ directory for trained models
- [ ] T004 [P] Copy trained model files from solar_forecast_linear/models/ to python-worker/models/

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T005 [P] Contract test real forecast POST /api/v1/forecast/generate in python-worker/tests/integration/test_forecast_real_api.py
- [ ] T006 [P] Contract test confidence bands validation in python-worker/tests/integration/test_forecast_confidence.py
- [ ] T007 [P] Integration test database storage of forecasts in python-worker/tests/integration/test_forecast_storage.py
- [ ] T008 [P] Integration test capacity constraint validation in python-worker/tests/integration/test_capacity_constraints.py
- [ ] T009 [P] Integration test model loading from database location in python-worker/tests/integration/test_model_loading.py
- [ ] T010 [P] Performance test 100 locations <60 seconds in python-worker/tests/performance/test_forecast_performance.py

## Phase 3.3: Core Engine Implementation (ONLY after tests are failing)
- [ ] T011 [P] Copy solar_physics.py to python-worker/app/modules/forecast/core/solar_physics.py (pure functions only)
- [ ] T012 [P] Copy forecast_models.py to python-worker/app/modules/forecast/core/forecast_models.py (pure functions only)
- [ ] T013 [P] Copy unified_forecast.py to python-worker/app/modules/forecast/core/unified_forecast.py (pure functions only)
- [ ] T014 [P] Copy feature_engineering.py to python-worker/app/modules/forecast/core/feature_engineering.py (pure functions only)
- [ ] T015 [P] Copy shoulders_enhancement.py to python-worker/app/modules/forecast/core/shoulders_enhancement.py (pure functions only)
- [ ] T016 [P] Copy performance_adjustment.py to python-worker/app/modules/forecast/core/performance_adjustment.py (pure functions only)

## Phase 3.4: Database Integration
- [ ] T017 Add get_location_full() method to python-worker/app/modules/forecast/repositories.py
- [ ] T018 Add get_recent_weather() method to python-worker/app/modules/forecast/repositories.py
- [ ] T019 Fix field mapping in save_forecasts() method in python-worker/app/modules/forecast/repositories.py
- [ ] T020 Add bulk_save_forecasts() with TimescaleDB optimization to python-worker/app/modules/forecast/repositories.py
- [ ] T021 Add build_config_from_location() function to python-worker/app/modules/forecast/repositories.py

## Phase 3.5: Service Layer Updates
- [ ] T022 Replace mock _generate_forecasts() with real unified_forecast in python-worker/app/modules/forecast/services.py
- [ ] T023 Update validate_location() to check database-driven configs in python-worker/app/modules/forecast/services.py
- [ ] T024 Add load_location_models() function to python-worker/app/modules/ml_models/services.py
- [ ] T025 Update process_forecast_task() to use database weather and configs in python-worker/app/modules/forecast/services.py

## Phase 3.6: Model Loading & Registry
- [ ] T026 [P] Create dynamic model loader function in python-worker/app/modules/ml_models/services.py
- [ ] T027 [P] Add model metadata tracking in python-worker/app/modules/ml_models/services.py
- [ ] T028 [P] Add fallback model loading strategy in python-worker/app/modules/ml_models/services.py

## Phase 3.7: API Controller Updates
- [ ] T029 Add real data validation to forecast controllers in python-worker/app/modules/forecast/controllers.py
- [ ] T030 Add capacity constraint validation to API responses in python-worker/app/modules/forecast/controllers.py
- [ ] T031 Update error handling for model loading failures in python-worker/app/modules/forecast/controllers.py

## Phase 3.8: Polish & Validation
- [ ] T032 [P] Unit tests for database config mapping in python-worker/tests/unit/test_config_mapping.py
- [ ] T033 [P] Unit tests for model loading logic in python-worker/tests/unit/test_model_loading.py
- [ ] T034 [P] Unit tests for capacity constraint validation in python-worker/tests/unit/test_capacity_validation.py
- [ ] T035 Performance validation: All forecasts complete in <5MB memory per location
- [ ] T036 End-to-end test: Weather DB → Real Forecast → Database Storage → API Response
- [ ] T037 [P] Update python-worker/README.md with real forecast capabilities
- [ ] T038 Remove all mock data generation code from forecast services
- [ ] T039 Validate NO CLASSES architecture maintained throughout

## Dependencies
**CRITICAL TDD ORDERING**:
- Tests (T005-T010) MUST COMPLETE and FAIL before implementation (T011-T031)
- Core engine (T011-T016) before service updates (T022-T025)
- Database integration (T017-T021) before service layer (T022-T025)
- Model loading (T026-T028) before service integration (T024-T025)
- Implementation complete before polish (T032-T039)

**BLOCKING RELATIONSHIPS**:
- T004 (model files) blocks T026 (model loader)
- T017-T021 (database methods) blocks T022-T025 (service updates)
- T011-T016 (core engine) blocks T022 (forecast generation)
- T026-T028 (model loading) blocks T024 (service model integration)

## Parallel Example
```
# Launch T005-T010 together (all different test files):
Task: "Contract test real forecast in python-worker/tests/integration/test_forecast_real_api.py"
Task: "Contract test confidence bands in python-worker/tests/integration/test_forecast_confidence.py"
Task: "Integration test database storage in python-worker/tests/integration/test_forecast_storage.py"
Task: "Integration test capacity constraints in python-worker/tests/integration/test_capacity_constraints.py"

# Launch T011-T016 together (all different core files):
Task: "Copy solar_physics.py to python-worker/app/modules/forecast/core/solar_physics.py"
Task: "Copy forecast_models.py to python-worker/app/modules/forecast/core/forecast_models.py"
Task: "Copy unified_forecast.py to python-worker/app/modules/forecast/core/unified_forecast.py"
```

## Notes
- **CRITICAL**: NO CLASSES allowed - all copied functions must remain pure functions
- **CRITICAL**: NO MOCK DATA allowed - all tests must use real database data
- **CRITICAL**: All forecasts MUST be ≤ plant capacity (validate in tests T008, T034)
- **CRITICAL**: Tests must fail first (RED phase) before implementation
- Verify database field mapping carefully (powerMW not powerOutputMW)
- Model files are 20MB+ each - ensure adequate storage
- TimescaleDB optimization critical for bulk forecast insertion
- Commit after each task completion

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each forecast endpoint → contract test task [P]
   - Each confidence band requirement → validation test [P]

2. **From Data Model**:
   - LocationConfig → database mapping tasks
   - ForecastResult → storage optimization tasks
   - ModelRegistry → dynamic loading tasks

3. **From User Stories**:
   - Real forecast generation → end-to-end integration test [P]
   - Performance requirements → dedicated performance tests [P]

4. **Ordering**:
   - Setup → Tests → Core Engine → Database → Services → Polish
   - TDD: All tests before any implementation
   - Dependencies: Database methods before service layer

## Validation Checklist
*GATE: Checked before task execution*

- [x] All forecast endpoints have corresponding contract tests
- [x] All database entities have integration tests
- [x] All tests come before implementation (TDD enforced)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] NO CLASSES architecture preserved in all copied modules
- [x] NO MOCK DATA restriction enforced in all tests
- [x] Capacity constraint validation included (T008, T030, T034)