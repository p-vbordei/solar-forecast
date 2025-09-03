# Product Requirements Document - Python Worker Services
# Solar Forecast Platform - Backend Architecture

**Version:** 1.0  
**Date:** September 2, 2025  
**Status:** Architecture Review & Implementation Planning

---

## 1. Executive Summary

This document details the Python worker architecture for the Solar Forecast Platform, ensuring a robust, scalable, and maintainable backend system. The architecture emphasizes clean separation of concerns, efficient data processing, and seamless integration with the SvelteKit frontend.

### 1.1 Critical Architecture Decisions

**Key Architectural Principles:**
1. **Separation of Concerns**: Clear boundary between web API and compute-intensive tasks
2. **Async-First Design**: Non-blocking operations for scalability
3. **Queue-Based Processing**: Decouple request handling from heavy computation
4. **Stateless Workers**: Enable horizontal scaling
5. **Event-Driven Pipeline**: Reactive data processing architecture

### 1.2 Architecture Validation

**Potential Issues Addressed:**
- ✅ **Memory Management**: Worker processes for heavy ML tasks
- ✅ **Blocking Operations**: Async/queue patterns prevent blocking
- ✅ **Database Connections**: Connection pooling with proper limits
- ✅ **Error Recovery**: Circuit breakers and retry mechanisms
- ✅ **Monitoring**: Comprehensive logging and metrics

---

## 2. System Architecture Overview

### 2.1 Three-Tier Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Presentation Tier                        │
│                    SvelteKit Application                      │
│                  (SSR + Client-Side Hydration)               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                      Application Tier                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │               SvelteKit API Routes                      │ │
│  │            (Request Validation & Routing)               │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                                │
│                              ▼                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │               FastAPI Gateway Service                   │ │
│  │         (Authentication, Rate Limiting, Routing)        │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                                │
│           ┌──────────────────┴──────────────────┐           │
│           ▼                                      ▼           │
│  ┌─────────────────┐                   ┌─────────────────┐ │
│  │  Web API Service │                   │  Worker Service  │ │
│  │   (Sync Ops)     │                   │  (Async Tasks)   │ │
│  └─────────────────┘                   └─────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                        Data Tier                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │  PostgreSQL    │  │  TimescaleDB   │  │     Redis      │ │
│  │  (Metadata)    │  │  (Time-series) │  │    (Cache)     │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Service Communication Pattern

```python
# CORRECT: Non-blocking async pattern
async def handle_forecast_request(location_id: int) -> dict:
    # 1. Validate request
    location = await validate_location(location_id)
    
    # 2. Queue task for worker
    task_id = await queue_forecast_task(location_id)
    
    # 3. Return immediately with task ID
    return {
        "task_id": task_id,
        "status": "queued",
        "poll_url": f"/api/tasks/{task_id}"
    }

# WRONG: Blocking synchronous pattern
def bad_handle_forecast(location_id: int) -> dict:
    # DON'T DO THIS - blocks the event loop
    forecast = generate_ml_forecast(location_id)  # Heavy computation
    return forecast
```

---

## 3. Python Worker Architecture

### 3.1 Project Structure

```
/python-worker/
├── pyproject.toml              # UV package management
├── .python-version             # Python version (3.11+)
├── .env                        # Environment variables
├── alembic.ini                 # Database migrations
├── /app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Settings management
│   ├── /core/               
│   │   ├── database.py         # DB connection
│   │   ├── security.py         # Auth utilities
│   │   ├── exceptions.py       # Custom exceptions
│   │   ├── dependencies.py     # Shared dependencies
│   │   └── base_repository.py  # Base CRUD operations
│   ├── /modules/               # Business modules
│   │   ├── /forecast/
│   │   │   ├── controllers.py  # API endpoints
│   │   │   ├── services.py     # Business logic
│   │   │   ├── repositories.py # Data access
│   │   │   ├── models_db.py    # SQLAlchemy models
│   │   │   ├── models_api.py   # Pydantic schemas
│   │   │   └── tasks.py        # Async tasks
│   │   ├── /weather/
│   │   ├── /satellite/
│   │   ├── /analysis/
│   │   └── /pipeline/
│   ├── /workers/               # Background workers
│   │   ├── forecast_worker.py
│   │   ├── data_worker.py
│   │   └── notification_worker.py
│   └── /utils/
│       ├── queue.py            # Queue management
│       ├── cache.py            # Redis caching
│       └── metrics.py          # Performance tracking
├── /migrations/                # Alembic migrations
├── /tests/                     # Test suite
└── /scripts/                   # Utility scripts
```

### 3.2 Module Implementation Pattern

**EVERY module MUST follow this pattern:**

```python
# /modules/forecast/controllers.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from .services import ForecastService
from .models_api import ForecastRequest, ForecastResponse

router = APIRouter(prefix="/forecast", tags=["forecast"])

@router.post("/generate", response_model=ForecastResponse)
async def generate_forecast(
    request: ForecastRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Controller: Handle HTTP, delegate to service"""
    service = ForecastService(db)
    try:
        result = await service.generate_forecast(
            location_id=request.location_id,
            user_id=current_user.id
        )
        return ForecastResponse.from_orm(result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

```python
# /modules/forecast/services.py
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from .repositories import ForecastRepository
from app.modules.weather.services import WeatherService
from app.workers.tasks import queue_forecast_generation

class ForecastService:
    """Service: Business logic ONLY, NO direct DB access"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repo = ForecastRepository(db)
        self.weather_service = WeatherService(db)
    
    async def generate_forecast(
        self, 
        location_id: int, 
        user_id: int
    ) -> dict:
        # 1. Validate business rules
        location = await self.repo.get_location(location_id)
        if not location:
            raise ValueError(f"Location {location_id} not found")
        
        if not location.is_active:
            raise ValueError("Location is not active")
        
        # 2. Check cache
        cached = await self.repo.get_recent_forecast(
            location_id, 
            max_age=timedelta(hours=1)
        )
        if cached:
            return cached
        
        # 3. Queue async task for heavy computation
        task_id = await queue_forecast_generation.delay(
            location_id=location_id,
            user_id=user_id
        )
        
        # 4. Return task reference
        return {
            "task_id": task_id,
            "status": "processing",
            "estimated_time": 30  # seconds
        }
```

```python
# /modules/forecast/repositories.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import Optional, List
from datetime import datetime, timedelta

from .models_db import Forecast, Location
from app.core.base_repository import BaseRepository

class ForecastRepository(BaseRepository[Forecast]):
    """Repository: Data access ONLY, NO business logic"""
    
    def __init__(self, db: Session):
        super().__init__(Forecast, db)
    
    async def get_location(self, location_id: int) -> Optional[Location]:
        """Get location by ID"""
        return self.db.query(Location).filter(
            Location.id == location_id
        ).first()
    
    async def get_recent_forecast(
        self, 
        location_id: int,
        max_age: timedelta
    ) -> Optional[Forecast]:
        """Get most recent forecast if within age limit"""
        cutoff = datetime.utcnow() - max_age
        return self.db.query(Forecast).filter(
            and_(
                Forecast.location_id == location_id,
                Forecast.created_at >= cutoff
            )
        ).order_by(desc(Forecast.created_at)).first()
    
    async def save_forecast(self, forecast_data: dict) -> Forecast:
        """Save forecast to database"""
        forecast = Forecast(**forecast_data)
        self.db.add(forecast)
        self.db.commit()
        self.db.refresh(forecast)
        return forecast
```

### 3.3 Database Models with TimescaleDB

```python
# /modules/forecast/models_db.py
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base

class Location(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity_kw = Column(Float, nullable=False)
    panel_count = Column(Integer)
    panel_specs = Column(JSON)  # Flexible panel configuration
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", back_populates="locations")
    forecasts = relationship("Forecast", back_populates="location")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_location_client', 'client_id'),
        Index('idx_location_coords', 'latitude', 'longitude'),
    )

class Forecast(Base):
    """TimescaleDB hypertable for forecast data"""
    __tablename__ = "forecasts"
    
    # Composite primary key for time-series
    time = Column(DateTime, primary_key=True)
    location_id = Column(Integer, ForeignKey("locations.id"), primary_key=True)
    
    # Forecast data
    power_output_kw = Column(Float, nullable=False)
    energy_kwh = Column(Float)
    confidence = Column(Float)  # 0-100%
    model_type = Column(String(50))  # 'ml', 'physical', 'hybrid'
    
    # Weather snapshot
    temperature_c = Column(Float)
    irradiance_wm2 = Column(Float)
    cloud_cover_pct = Column(Float)
    weather_data = Column(JSON)  # Full weather context
    
    # Metadata
    forecast_horizon_hours = Column(Integer)  # How far ahead
    created_at = Column(DateTime, default=datetime.utcnow)
    model_version = Column(String(50))
    
    # Relationships
    location = relationship("Location", back_populates="forecasts")
    
    # This becomes a hypertable
    __table_args__ = (
        Index('idx_forecast_location_time', 'location_id', 'time'),
    )
```

### 3.4 Worker Implementation

```python
# /workers/forecast_worker.py
import asyncio
from celery import Celery
from datetime import datetime, timedelta
import numpy as np

from app.core.config import settings
from app.modules.ml_models.solar_model import SolarForecastModel
from app.modules.weather.services import WeatherService

# Initialize Celery
celery_app = Celery(
    'forecast_worker',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

@celery_app.task(bind=True, max_retries=3)
def generate_forecast_task(self, location_id: int, user_id: int):
    """
    Heavy computation task for forecast generation
    Runs in separate worker process
    """
    try:
        # 1. Get location data
        with get_db_session() as db:
            location = db.query(Location).filter(
                Location.id == location_id
            ).first()
            
            if not location:
                raise ValueError(f"Location {location_id} not found")
        
        # 2. Fetch weather data (async operation)
        weather_service = WeatherService()
        weather_data = asyncio.run(
            weather_service.get_forecast(
                lat=location.latitude,
                lon=location.longitude,
                days=7
            )
        )
        
        # 3. Load ML model (cached in memory)
        model = SolarForecastModel.load_for_location(location_id)
        
        # 4. Generate forecast (CPU-intensive)
        forecast_results = []
        for hour in range(168):  # 7 days
            forecast_time = datetime.utcnow() + timedelta(hours=hour)
            
            # Prepare features
            features = prepare_features(
                location=location,
                weather=weather_data[hour],
                time=forecast_time
            )
            
            # Predict
            power_output = model.predict(features)
            confidence = model.predict_confidence(features)
            
            forecast_results.append({
                'time': forecast_time,
                'location_id': location_id,
                'power_output_kw': float(power_output),
                'confidence': float(confidence),
                'model_type': 'ml',
                'weather_data': weather_data[hour]
            })
        
        # 5. Save to database (batch insert)
        with get_db_session() as db:
            save_forecasts_batch(db, forecast_results)
        
        # 6. Notify completion
        send_notification(
            user_id=user_id,
            message=f"Forecast ready for {location.name}"
        )
        
        return {
            'status': 'completed',
            'location_id': location_id,
            'forecast_count': len(forecast_results)
        }
        
    except Exception as e:
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=2 ** self.request.retries)
```

---

## 4. Data Pipeline Architecture

### 4.1 Orchestration Pattern

```python
# /modules/pipeline/orchestrator.py
from typing import List, Dict, Any
from datetime import datetime
import asyncio
from enum import Enum

class PipelineStage(Enum):
    DATA_GATHERING = "data_gathering"
    QUALITY_CHECK = "quality_check"
    FORECAST_GENERATION = "forecast_generation"
    AGGREGATION = "aggregation"
    STORAGE = "storage"
    NOTIFICATION = "notification"

class PipelineOrchestrator:
    """
    Manages end-to-end data pipeline execution
    Uses async/await for non-blocking operations
    """
    
    def __init__(self):
        self.stages = {
            PipelineStage.DATA_GATHERING: DataGatheringStage(),
            PipelineStage.QUALITY_CHECK: QualityCheckStage(),
            PipelineStage.FORECAST_GENERATION: ForecastGenerationStage(),
            PipelineStage.AGGREGATION: AggregationStage(),
            PipelineStage.STORAGE: StorageStage(),
            PipelineStage.NOTIFICATION: NotificationStage()
        }
    
    async def run_pipeline(
        self, 
        location_ids: List[int],
        pipeline_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute full pipeline with error handling"""
        
        context = PipelineContext(
            location_ids=location_ids,
            config=pipeline_config,
            start_time=datetime.utcnow()
        )
        
        try:
            # Execute stages sequentially with checkpoints
            for stage_name in PipelineStage:
                stage = self.stages[stage_name]
                
                # Pre-stage validation
                if not await stage.can_execute(context):
                    context.skip_stage(stage_name, "Prerequisites not met")
                    continue
                
                # Execute stage
                context.start_stage(stage_name)
                result = await stage.execute(context)
                context.complete_stage(stage_name, result)
                
                # Post-stage validation
                if not await stage.validate_output(result):
                    raise PipelineError(f"Stage {stage_name} validation failed")
                
                # Save checkpoint for recovery
                await self.save_checkpoint(context)
            
            return context.to_dict()
            
        except Exception as e:
            # Handle failure with recovery attempt
            await self.handle_failure(context, e)
            raise
```

### 4.2 Data Processing Scripts Architecture

```python
# /modules/pipeline/stages/data_gathering.py
import aiohttp
import asyncio
from typing import List, Dict
import pandas as pd

class DataGatheringStage:
    """
    Async data collection from multiple sources
    """
    
    async def execute(self, context: PipelineContext) -> Dict:
        """Gather data from all sources concurrently"""
        
        tasks = []
        
        # Create concurrent tasks for each data source
        for location_id in context.location_ids:
            tasks.extend([
                self.fetch_weather_data(location_id),
                self.fetch_satellite_data(location_id),
                self.fetch_production_data(location_id)
            ])
        
        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        data = self.merge_data_sources(results)
        
        # Quality check
        data_quality = self.assess_data_quality(data)
        
        return {
            'data': data,
            'quality_score': data_quality,
            'sources_fetched': len(tasks),
            'failures': sum(1 for r in results if isinstance(r, Exception))
        }
    
    async def fetch_weather_data(self, location_id: int) -> pd.DataFrame:
        """Fetch weather data with retry logic"""
        
        async with aiohttp.ClientSession() as session:
            for attempt in range(3):
                try:
                    async with session.get(
                        f"{WEATHER_API_URL}/forecast",
                        params={'location_id': location_id},
                        timeout=aiohttp.ClientTimeout(total=30)
                    ) as response:
                        data = await response.json()
                        return pd.DataFrame(data)
                except Exception as e:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(2 ** attempt)
```

---

## 5. ML Model Management

### 5.1 Model Architecture

```python
# /modules/ml_models/solar_model.py
import torch
import torch.nn as nn
from typing import Dict, Tuple
import numpy as np

class SolarForecastModel(nn.Module):
    """
    Hybrid ML model for solar forecasting
    Combines LSTM for time-series with physics-based constraints
    """
    
    def __init__(self, config: Dict):
        super().__init__()
        
        # Time-series component (LSTM)
        self.lstm = nn.LSTM(
            input_size=config['input_features'],
            hidden_size=config['hidden_size'],
            num_layers=config['num_layers'],
            dropout=config['dropout'],
            batch_first=True
        )
        
        # Weather processing (CNN for cloud images)
        self.weather_cnn = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1)),
            nn.Flatten()
        )
        
        # Physics-based constraints layer
        self.physics_layer = PhysicsConstraintLayer(
            panel_config=config['panel_config']
        )
        
        # Output layer
        self.output = nn.Sequential(
            nn.Linear(config['hidden_size'] + 64, 128),
            nn.ReLU(),
            nn.Dropout(config['dropout']),
            nn.Linear(128, 1)  # Power output
        )
        
    def forward(
        self, 
        time_series: torch.Tensor,
        weather_images: torch.Tensor,
        solar_angles: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass with uncertainty estimation
        """
        # Process time-series
        lstm_out, _ = self.lstm(time_series)
        lstm_features = lstm_out[:, -1, :]  # Last timestep
        
        # Process weather images
        weather_features = self.weather_cnn(weather_images)
        
        # Combine features
        combined = torch.cat([lstm_features, weather_features], dim=1)
        
        # Generate prediction
        raw_output = self.output(combined)
        
        # Apply physics constraints
        constrained_output = self.physics_layer(
            raw_output, 
            solar_angles
        )
        
        # Estimate uncertainty
        uncertainty = self.estimate_uncertainty(combined)
        
        return constrained_output, uncertainty
```

### 5.2 Model Training Pipeline

```python
# /modules/ml_models/training.py
from pytorch_lightning import LightningModule, Trainer
from torch.utils.data import DataLoader
import wandb

class SolarForecastTrainer(LightningModule):
    """
    PyTorch Lightning module for model training
    """
    
    def __init__(self, model_config: Dict):
        super().__init__()
        self.model = SolarForecastModel(model_config)
        self.save_hyperparameters()
        
    def training_step(self, batch, batch_idx):
        x, y = batch
        y_hat, uncertainty = self.model(x)
        
        # Custom loss with uncertainty weighting
        loss = self.weighted_mse_loss(y_hat, y, uncertainty)
        
        # Log metrics
        self.log('train_loss', loss)
        self.log('train_rmse', torch.sqrt(loss))
        
        return loss
    
    def configure_optimizers(self):
        optimizer = torch.optim.AdamW(
            self.parameters(),
            lr=self.hparams.learning_rate,
            weight_decay=self.hparams.weight_decay
        )
        
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
            optimizer,
            T_max=self.hparams.max_epochs
        )
        
        return [optimizer], [scheduler]
    
    def train_model(self, train_data: DataLoader, val_data: DataLoader):
        """Train model with automatic optimization"""
        
        trainer = Trainer(
            max_epochs=self.hparams.max_epochs,
            accelerator='gpu' if torch.cuda.is_available() else 'cpu',
            precision=16,  # Mixed precision training
            gradient_clip_val=1.0,
            callbacks=[
                ModelCheckpoint(monitor='val_loss'),
                EarlyStopping(patience=10)
            ],
            logger=WandbLogger(project='solar-forecast')
        )
        
        trainer.fit(self, train_data, val_data)
```

---

## 6. Integration with SvelteKit

### 6.1 API Integration Pattern

```typescript
// /src/lib/server/services/forecastService.ts
import { PYTHON_WORKER_URL } from '$env/static/private';
import type { ForecastRequest, ForecastResponse } from '$lib/types';

export class ForecastService {
    private baseUrl: string;
    
    constructor() {
        this.baseUrl = PYTHON_WORKER_URL || 'http://localhost:8000';
    }
    
    async generateForecast(
        locationId: number,
        options?: ForecastRequest
    ): Promise<ForecastResponse> {
        // 1. Call Python worker API
        const response = await fetch(`${this.baseUrl}/api/forecast/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await this.getServiceToken()}`
            },
            body: JSON.stringify({
                location_id: locationId,
                ...options
            })
        });
        
        if (!response.ok) {
            throw new Error(`Forecast generation failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // 2. Handle async task pattern
        if (result.task_id) {
            // Poll for completion
            return await this.pollTaskResult(result.task_id);
        }
        
        return result;
    }
    
    private async pollTaskResult(
        taskId: string,
        maxAttempts = 30,
        interval = 2000
    ): Promise<ForecastResponse> {
        for (let i = 0; i < maxAttempts; i++) {
            const status = await this.getTaskStatus(taskId);
            
            if (status.state === 'SUCCESS') {
                return status.result;
            } else if (status.state === 'FAILURE') {
                throw new Error(`Task failed: ${status.error}`);
            }
            
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        throw new Error('Task timeout');
    }
}
```

### 6.2 WebSocket for Real-time Updates

```typescript
// /src/routes/api/ws/+server.ts
import { WebSocketServer } from 'ws';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, platform }) => {
    const upgradeHeader = request.headers.get('upgrade');
    
    if (upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
    }
    
    const wss = new WebSocketServer({ noServer: true });
    
    wss.on('connection', (ws) => {
        // Subscribe to Redis pub/sub for real-time updates
        subscribeToUpdates(ws);
        
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            
            switch (message.type) {
                case 'SUBSCRIBE_FORECAST':
                    subscribeForecastUpdates(ws, message.locationId);
                    break;
                case 'SUBSCRIBE_ALERTS':
                    subscribeAlertUpdates(ws);
                    break;
            }
        });
    });
    
    return new Response(null, {
        status: 101,
        headers: {
            'Upgrade': 'websocket',
            'Connection': 'Upgrade'
        }
    });
};
```

---

## 7. Database Design & Optimization

### 7.1 TimescaleDB Configuration

```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create hypertables for time-series data
SELECT create_hypertable('forecasts', 'time', 
    chunk_time_interval => INTERVAL '1 week',
    if_not_exists => TRUE
);

SELECT create_hypertable('production', 'time',
    chunk_time_interval => INTERVAL '1 week',
    if_not_exists => TRUE
);

-- Add compression policy (compress chunks older than 1 month)
ALTER TABLE forecasts SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'location_id',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('forecasts', INTERVAL '1 month');

-- Create continuous aggregates for performance
CREATE MATERIALIZED VIEW hourly_production
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS hour,
    location_id,
    AVG(power_output_kw) as avg_power,
    SUM(energy_kwh) as total_energy,
    MAX(power_output_kw) as peak_power
FROM production
GROUP BY hour, location_id
WITH NO DATA;

-- Refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('hourly_production',
    start_offset => INTERVAL '1 week',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);

-- Retention policy (keep detailed data for 2 years)
SELECT add_retention_policy('forecasts', INTERVAL '2 years');
SELECT add_retention_policy('production', INTERVAL '2 years');
```

### 7.2 Query Optimization

```python
# /modules/forecast/repositories.py
class OptimizedForecastRepository:
    """
    Repository with query optimization for TimescaleDB
    """
    
    async def get_forecast_range(
        self,
        location_id: int,
        start_time: datetime,
        end_time: datetime,
        resolution: str = 'hour'
    ) -> List[Dict]:
        """
        Optimized query using time_bucket for aggregation
        """
        
        # Use time_bucket for efficient aggregation
        if resolution == 'hour':
            bucket = "time_bucket('1 hour', time)"
        elif resolution == 'day':
            bucket = "time_bucket('1 day', time)"
        else:
            bucket = "time"
        
        query = f"""
        SELECT 
            {bucket} AS time,
            location_id,
            AVG(power_output_kw) AS avg_power,
            AVG(confidence) AS avg_confidence,
            MAX(power_output_kw) AS max_power,
            MIN(power_output_kw) AS min_power
        FROM forecasts
        WHERE 
            location_id = :location_id
            AND time >= :start_time
            AND time < :end_time
        GROUP BY 1, 2
        ORDER BY time ASC
        """
        
        result = await self.db.execute(
            query,
            {
                'location_id': location_id,
                'start_time': start_time,
                'end_time': end_time
            }
        )
        
        return result.fetchall()
```

---

## 8. Error Handling & Recovery

### 8.1 Circuit Breaker Pattern

```python
# /utils/circuit_breaker.py
from typing import Callable, Any
import asyncio
from datetime import datetime, timedelta

class CircuitBreaker:
    """
    Prevents cascading failures in distributed system
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection"""
        
        if self.state == 'OPEN':
            if self._should_attempt_reset():
                self.state = 'HALF_OPEN'
            else:
                raise CircuitOpenError("Circuit breaker is OPEN")
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        """Reset circuit breaker on success"""
        self.failure_count = 0
        self.state = 'CLOSED'
    
    def _on_failure(self):
        """Handle failure and potentially open circuit"""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()
        
        if self.failure_count >= self.failure_threshold:
            self.state = 'OPEN'
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to retry"""
        return (
            self.last_failure_time and
            datetime.utcnow() - self.last_failure_time > 
            timedelta(seconds=self.recovery_timeout)
        )
```

### 8.2 Retry Strategy

```python
# /utils/retry.py
import asyncio
from typing import TypeVar, Callable
from functools import wraps

T = TypeVar('T')

def exponential_backoff_retry(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0
):
    """
    Decorator for exponential backoff retry
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    
                    if attempt == max_retries - 1:
                        break
                    
                    # Calculate delay with exponential backoff
                    delay = min(base_delay * (2 ** attempt), max_delay)
                    
                    # Add jitter to prevent thundering herd
                    jitter = random.uniform(0, delay * 0.1)
                    
                    await asyncio.sleep(delay + jitter)
            
            raise last_exception
        
        return wrapper
    return decorator
```

---

## 9. Monitoring & Observability

### 9.1 Metrics Collection

```python
# /utils/metrics.py
from prometheus_client import Counter, Histogram, Gauge
import time
from functools import wraps

# Define metrics
request_count = Counter(
    'api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status']
)

request_duration = Histogram(
    'api_request_duration_seconds',
    'API request duration',
    ['method', 'endpoint']
)

active_tasks = Gauge(
    'worker_active_tasks',
    'Number of active worker tasks',
    ['task_type']
)

forecast_accuracy = Gauge(
    'forecast_accuracy_percentage',
    'Forecast accuracy by location',
    ['location_id', 'model_type']
)

def track_metrics(endpoint: str):
    """Decorator to track API metrics"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            status = 'success'
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                status = 'error'
                raise
            finally:
                duration = time.time() - start_time
                request_count.labels(
                    method=func.__name__,
                    endpoint=endpoint,
                    status=status
                ).inc()
                request_duration.labels(
                    method=func.__name__,
                    endpoint=endpoint
                ).observe(duration)
        
        return wrapper
    return decorator
```

### 9.2 Structured Logging

```python
# /utils/logging.py
import structlog
from typing import Dict, Any

def setup_logging():
    """Configure structured logging"""
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

# Usage
logger = structlog.get_logger()

async def process_forecast(location_id: int):
    logger.info(
        "Starting forecast processing",
        location_id=location_id,
        timestamp=datetime.utcnow().isoformat()
    )
    
    try:
        result = await generate_forecast(location_id)
        logger.info(
            "Forecast completed",
            location_id=location_id,
            power_output=result['power'],
            confidence=result['confidence']
        )
    except Exception as e:
        logger.error(
            "Forecast failed",
            location_id=location_id,
            error=str(e),
            exc_info=True
        )
```

---

## 10. Security Implementation

### 10.1 API Security

```python
# /core/security.py
from fastapi import Security, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from datetime import datetime, timedelta

security = HTTPBearer()

class JWTAuth:
    """JWT authentication handler"""
    
    def __init__(self):
        self.secret = settings.SECRET_KEY
        self.algorithm = "HS256"
    
    def create_token(
        self,
        user_id: int,
        expires_delta: timedelta = timedelta(hours=24)
    ) -> str:
        """Create JWT token"""
        payload = {
            'user_id': user_id,
            'exp': datetime.utcnow() + expires_delta,
            'iat': datetime.utcnow(),
            'type': 'access'
        }
        return jwt.encode(payload, self.secret, algorithm=self.algorithm)
    
    async def verify_token(
        self,
        credentials: HTTPAuthorizationCredentials = Security(security)
    ) -> Dict:
        """Verify JWT token"""
        token = credentials.credentials
        
        try:
            payload = jwt.decode(
                token,
                self.secret,
                algorithms=[self.algorithm]
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

# Rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/forecast/generate")
@limiter.limit("10/minute")
async def generate_forecast(request: Request):
    # Rate-limited endpoint
    pass
```

---

## 11. Testing Strategy

### 11.1 Unit Testing

```python
# /tests/test_forecast_service.py
import pytest
from unittest.mock import Mock, AsyncMock
from datetime import datetime

from app.modules.forecast.services import ForecastService
from app.modules.forecast.models_api import ForecastRequest

@pytest.fixture
def mock_db():
    """Mock database session"""
    return Mock()

@pytest.fixture
def forecast_service(mock_db):
    """Forecast service with mocked dependencies"""
    return ForecastService(mock_db)

@pytest.mark.asyncio
async def test_generate_forecast_success(forecast_service, mock_db):
    """Test successful forecast generation"""
    
    # Arrange
    location_id = 1
    mock_db.query.return_value.filter.return_value.first.return_value = {
        'id': location_id,
        'is_active': True
    }
    
    # Act
    result = await forecast_service.generate_forecast(
        location_id=location_id,
        user_id=1
    )
    
    # Assert
    assert result['status'] == 'processing'
    assert 'task_id' in result

@pytest.mark.asyncio
async def test_generate_forecast_invalid_location(forecast_service, mock_db):
    """Test forecast generation with invalid location"""
    
    # Arrange
    mock_db.query.return_value.filter.return_value.first.return_value = None
    
    # Act & Assert
    with pytest.raises(ValueError, match="Location .* not found"):
        await forecast_service.generate_forecast(
            location_id=999,
            user_id=1
        )
```

### 11.2 Integration Testing

```python
# /tests/integration/test_pipeline.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import asyncio

from app.core.database import Base
from app.modules.pipeline.orchestrator import PipelineOrchestrator

@pytest.fixture
async def test_db():
    """Create test database"""
    engine = create_engine("postgresql://test:test@localhost/test_db")
    Base.metadata.create_all(engine)
    
    SessionLocal = sessionmaker(bind=engine)
    
    yield SessionLocal()
    
    Base.metadata.drop_all(engine)

@pytest.mark.asyncio
async def test_full_pipeline_execution(test_db):
    """Test complete pipeline execution"""
    
    # Setup test data
    location = create_test_location(test_db)
    
    # Run pipeline
    orchestrator = PipelineOrchestrator()
    result = await orchestrator.run_pipeline(
        location_ids=[location.id],
        pipeline_config={'test_mode': True}
    )
    
    # Verify results
    assert result['status'] == 'completed'
    assert all(
        stage['status'] == 'completed' 
        for stage in result['stages'].values()
    )
```

---

## 12. Deployment Configuration

### 12.1 Docker Configuration

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Install UV package manager
RUN pip install uv

# Set working directory
WORKDIR /app

# Copy dependency files
COPY pyproject.toml .
COPY uv.lock .

# Install dependencies with UV
RUN uv sync --frozen

# Copy application code
COPY . .

# Run migrations
RUN uv run alembic upgrade head

# Start application
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 12.2 Railway Configuration

```toml
# railway.toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 3

[[services]]
name = "api"
type = "web"

[[services]]
name = "worker"
type = "worker"
startCommand = "uv run celery -A app.workers.forecast_worker worker --loglevel=info"

[env]
DATABASE_URL = "${DATABASE_URL}"
REDIS_URL = "${REDIS_URL}"
SECRET_KEY = "${SECRET_KEY}"
WEATHER_API_KEY = "${WEATHER_API_KEY}"
```

---

## 13. Performance Optimization

### 13.1 Caching Strategy

```python
# /utils/cache.py
import redis
import json
from typing import Optional, Any
from datetime import timedelta

class RedisCache:
    """Redis caching with automatic serialization"""
    
    def __init__(self):
        self.client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True
        )
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        value = await self.client.get(key)
        if value:
            return json.loads(value)
        return None
    
    async def set(
        self,
        key: str,
        value: Any,
        expire: timedelta = timedelta(hours=1)
    ):
        """Set value in cache with expiration"""
        await self.client.setex(
            key,
            expire,
            json.dumps(value, default=str)
        )
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate all keys matching pattern"""
        keys = await self.client.keys(pattern)
        if keys:
            await self.client.delete(*keys)

# Usage in service
class CachedForecastService:
    def __init__(self):
        self.cache = RedisCache()
    
    async def get_forecast(self, location_id: int) -> Dict:
        # Try cache first
        cache_key = f"forecast:{location_id}"
        cached = await self.cache.get(cache_key)
        
        if cached:
            return cached
        
        # Generate if not cached
        forecast = await self.generate_forecast(location_id)
        
        # Cache result
        await self.cache.set(
            cache_key,
            forecast,
            expire=timedelta(minutes=30)
        )
        
        return forecast
```

---

## 14. Common Pitfalls & Solutions

### 14.1 Avoiding Common Mistakes

```python
# ❌ WRONG: Blocking operation in async context
async def bad_forecast():
    # This blocks the event loop!
    heavy_computation()  # Synchronous CPU-intensive task
    return result

# ✅ CORRECT: Use thread pool for CPU-intensive tasks
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4)

async def good_forecast():
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        executor,
        heavy_computation
    )
    return result

# ❌ WRONG: N+1 query problem
def bad_get_locations_with_forecasts():
    locations = db.query(Location).all()
    for location in locations:
        # This creates N additional queries!
        location.latest_forecast = db.query(Forecast).filter(
            Forecast.location_id == location.id
        ).first()
    return locations

# ✅ CORRECT: Use eager loading
def good_get_locations_with_forecasts():
    return db.query(Location).options(
        joinedload(Location.forecasts)
    ).all()

# ❌ WRONG: Not handling database connection properly
def bad_database_operation():
    db = SessionLocal()
    result = db.query(Model).all()
    # Connection leak! Session not closed
    return result

# ✅ CORRECT: Use context manager
def good_database_operation():
    with SessionLocal() as db:
        result = db.query(Model).all()
        return result
```

---

## 15. Checklist for Implementation

### Pre-Development Checklist
- [ ] Python 3.11+ installed
- [ ] UV package manager installed
- [ ] PostgreSQL with TimescaleDB extension
- [ ] Redis for caching and queues
- [ ] Environment variables configured

### Development Checklist
- [ ] Project structure created according to specification
- [ ] Database models defined with proper indexes
- [ ] CSR pattern implemented for all modules
- [ ] Async/await used for all I/O operations
- [ ] Worker processes configured for ML tasks
- [ ] Error handling with circuit breakers
- [ ] Comprehensive logging implemented
- [ ] Unit tests for all services
- [ ] Integration tests for critical paths
- [ ] API documentation (OpenAPI)

### Deployment Checklist
- [ ] Docker images built and tested
- [ ] Railway configuration validated
- [ ] Database migrations tested
- [ ] Health check endpoints working
- [ ] Monitoring dashboards configured
- [ ] Load testing completed (10 concurrent users)
- [ ] Backup strategy implemented
- [ ] Security scan completed

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-09-02 | System | Initial Python Worker PRD |

---

**END OF DOCUMENT**