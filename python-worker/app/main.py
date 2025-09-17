"""Main FastAPI application entry point"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
import structlog

from app.core.config import settings
from app.core.database import engine, Base
from app.modules.forecast import forecast_router
# Weather module removed - now using SvelteKit API
from app.modules.analysis import analysis_router
from app.modules.pipeline import pipeline_router

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
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

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting Solar Forecast Worker", version=settings.VERSION)
    
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("Database initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Solar Forecast Worker")
    await engine.dispose()


# Create FastAPI app
app = FastAPI(
    title="Solar Forecast Worker",
    description="""🌞 **Production-Ready Solar Energy Forecasting Service**

    Advanced ML-powered solar power forecasting system featuring:

    ## 🚀 Core Features
    - **Real CatBoost ML Models**: Quantile regression with uncertainty bands (P10, P25, P75, P90)
    - **PVLIB Physics Engine**: Complete solar modeling with ModelChain calculations
    - **Hybrid Forecasting**: Combines ML predictions with physics-based calculations
    - **TimescaleDB Integration**: Optimized time-series data storage and retrieval
    - **Async Processing**: Background task processing for long-running forecasts

    ## 📊 Forecast Capabilities
    - Horizon: 1-168 hours (up to 7 days)
    - Resolution: 15 minutes to daily
    - Confidence bands for uncertainty quantification
    - Weather-driven predictions using real meteorological data
    - Capacity constraint enforcement

    ## 🏭 Production Features
    - Database-driven configuration
    - Model fallback strategies
    - Comprehensive error handling
    - Performance monitoring
    - Bulk operations support

    ## 🔧 Architecture
    - NO CLASSES: Pure function architecture in core modules
    - NO MOCK DATA: 100% real data processing
    - CSR Pattern: Controller/Service/Repository layers
    - UTC timestamp handling throughout
    """,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_tags=[
        {
            "name": "Solar Forecasting",
            "description": "Generate and manage solar power forecasts using ML models and physics calculations"
        },
        {
            "name": "weather",
            "description": "Weather data management and synchronization"
        },
        {
            "name": "analysis",
            "description": "Advanced analysis and performance metrics"
        },
        {
            "name": "pipeline",
            "description": "Data pipeline operations"
        }
    ]
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

# Include routers
app.include_router(
    forecast_router,
    prefix="/api/v1/forecasts",
    tags=["Solar Forecasting"]
)

# Weather router removed - now using SvelteKit API

app.include_router(
    analysis_router,
    prefix="/api/v1/analysis",
    tags=["analysis"]
)

app.include_router(
    pipeline_router,
    prefix="/api/v1/pipeline",
    tags=["pipeline"]
)

# Mount Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG
    )