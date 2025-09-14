# Tasks: Python Worker Weather Database Integration

**Input**: Design documents from python-worker-weather-db-plan.md
**Prerequisites**: plan.md (required), existing Python worker structure

## Execution Flow (main)
```
1. Load plan.md from feature documentation
   → Extract: tech stack (FastAPI, SQLAlchemy), structure
2. Generate tasks by category:
   → Setup: models, configuration
   → Repository: database queries with raw SQL
   → Service: refactor to use repository
   → Integration: SvelteKit client
   → Tests: integration and unit tests
3. Apply task rules:
   → Different files = mark [P] for parallel
   → Tests before implementation (TDD)
4. Number tasks sequentially (T001, T002...)
5. Validate task completeness:
   → All repository methods implemented?
   → Service refactored completely?
   → Tests cover all new code?
6. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Python worker**: `python-worker/app/`, `python-worker/tests/`
- All paths relative to repository root

## Phase 3.1: Setup
- [ ] T001 Create weather model matching Prisma schema in python-worker/app/models/weather.py
- [ ] T002 [P] Update configuration with SvelteKit URL and weather settings in python-worker/app/core/config.py
- [ ] T003 [P] Create SvelteKit integration client in python-worker/app/integrations/sveltekit.py

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T004 [P] Integration test for weather repository database queries in python-worker/tests/integration/test_weather_repository.py
- [ ] T005 [P] Unit test for weather service freshness logic in python-worker/tests/unit/test_weather_freshness.py
- [ ] T006 [P] Integration test for SvelteKit sync trigger in python-worker/tests/integration/test_sveltekit_sync.py
- [ ] T007 [P] Unit test for weather data transformation in python-worker/tests/unit/test_weather_transform.py

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T008 Create weather repository with database queries in python-worker/app/modules/weather/repositories.py
- [ ] T009 Refactor weather service to use repository in python-worker/app/modules/weather/services.py (major refactor)
- [ ] T010 Implement freshness check logic in weather service
- [ ] T011 Add SvelteKit sync trigger to weather service
- [ ] T012 Update forecast service to use new weather service in python-worker/app/modules/forecast/services.py

## Phase 3.4: Controller & API Updates
- [ ] T013 Add GET /weather/current/{location_id} endpoint in python-worker/app/modules/weather/controllers.py
- [ ] T014 Add POST /weather/refresh/{location_id} endpoint in python-worker/app/modules/weather/controllers.py
- [ ] T015 Add GET /weather/status/{location_id} endpoint in python-worker/app/modules/weather/controllers.py
- [ ] T016 Update main.py to include new weather routes

## Phase 3.5: Integration & Error Handling
- [ ] T017 Add retry logic for SvelteKit sync failures
- [ ] T018 Implement caching layer for frequently accessed weather data
- [ ] T019 Add comprehensive error handling and logging
- [ ] T020 Add performance monitoring for database queries

## Phase 3.6: Polish & Documentation
- [ ] T021 [P] Add more unit tests for edge cases in python-worker/tests/unit/test_weather_edge_cases.py
- [ ] T022 [P] Performance test for bulk weather queries in python-worker/tests/performance/test_weather_performance.py
- [ ] T023 [P] Update API documentation with new endpoints
- [ ] T024 Add feature flag for gradual rollout
- [ ] T025 Remove old mock weather service code

## Dependencies
- Tests (T004-T007) before implementation (T008-T012)
- T001 blocks T008 (model needed for repository)
- T008 blocks T009-T011 (repository needed for service)
- T009 blocks T012 (service refactor before forecast update)
- T013-T015 depend on T009 (service needed for controllers)
- Implementation before polish (T021-T025)

## Parallel Example
```
# Launch T004-T007 together (all test files):
Task: "Integration test for weather repository in test_weather_repository.py"
Task: "Unit test for freshness logic in test_weather_freshness.py"
Task: "Integration test for SvelteKit sync in test_sveltekit_sync.py"
Task: "Unit test for data transformation in test_weather_transform.py"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Use raw SQL for Prisma table compatibility
- Maintain backward compatibility during refactor
- Test with real TimescaleDB instance

## Repository SQL Query Examples
```python
# Get recent weather (matching Prisma schema)
query = text('''
    SELECT
        id, timestamp, "locationId",
        temperature, humidity, pressure,
        "windSpeed", "cloudCover",
        ghi, dni, dhi
    FROM "WeatherData"
    WHERE "locationId" = :location_id
        AND timestamp >= NOW() - INTERVAL :hours HOUR
    ORDER BY timestamp DESC
''')
```

## Service Freshness Logic
```python
async def get_weather_with_freshness(location_id, max_age_minutes=15):
    latest = await repository.get_latest_weather(location_id)

    if not latest or (datetime.utcnow() - latest.timestamp).total_seconds() > max_age_minutes * 60:
        # Trigger sync via SvelteKit
        await sveltekit_client.trigger_weather_sync(location_id)
        await asyncio.sleep(2)  # Wait for sync
        latest = await repository.get_latest_weather(location_id)

    return latest
```

## Validation Checklist
*GATE: Checked before execution*

- [x] All repository methods have tests
- [x] Service refactor covers all existing functionality
- [x] Tests come before implementation
- [x] Parallel tasks truly independent
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] SQL queries match Prisma schema exactly
- [x] Backward compatibility maintained