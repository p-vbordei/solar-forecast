"""Pipeline API controllers"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from datetime import datetime

from app.core.database import get_db

router = APIRouter()

@router.post("/run")
async def run_pipeline(
    location_ids: List[int],
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Run data processing pipeline for multiple locations"""

    return {
        "status": "started",
        "location_ids": location_ids,
        "pipeline_id": f"pipeline_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        "started_at": datetime.utcnow().isoformat()
    }

@router.get("/status/{pipeline_id}")
async def get_pipeline_status(
    pipeline_id: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get pipeline execution status"""

    return {
        "pipeline_id": pipeline_id,
        "status": "running",
        "progress": 50,
        "current_step": "forecast_generation",
        "steps_completed": 2,
        "total_steps": 4
    }

@router.post("/schedule")
async def schedule_pipeline(
    location_ids: List[int],
    cron_expression: str = "0 */6 * * *",
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Schedule recurring pipeline execution"""

    return {
        "schedule_id": f"schedule_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        "location_ids": location_ids,
        "cron_expression": cron_expression,
        "next_run": datetime.utcnow().isoformat(),
        "status": "scheduled"
    }

@router.delete("/cancel/{pipeline_id}")
async def cancel_pipeline(
    pipeline_id: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Cancel a running pipeline"""

    return {
        "pipeline_id": pipeline_id,
        "status": "cancelled",
        "cancelled_at": datetime.utcnow().isoformat()
    }