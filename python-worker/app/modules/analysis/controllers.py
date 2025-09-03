"""Analysis API controllers"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List
from datetime import datetime, timedelta

from app.core.database import get_db

router = APIRouter()

@router.get("/performance/{location_id}")
async def get_performance_analysis(
    location_id: int,
    days: int = 30,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get performance analysis for a location"""
    
    # Mock performance data
    return {
        "location_id": location_id,
        "period_days": days,
        "capacity_factor": 23.5,
        "performance_ratio": 84.7,
        "availability": 99.2,
        "energy_yield": 1642,
        "total_production_mwh": 1245.6,
        "average_daily_mwh": 41.5,
        "peak_power_mw": 25.3,
        "losses": {
            "soiling": 2.1,
            "shading": 1.5,
            "temperature": 3.8,
            "inverter": 2.0
        }
    }

@router.get("/efficiency/{location_id}")
async def get_efficiency_metrics(
    location_id: int,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get efficiency metrics for a location"""
    
    return {
        "location_id": location_id,
        "overall_efficiency": 85.3,
        "panel_efficiency": 21.5,
        "inverter_efficiency": 98.2,
        "system_efficiency": 84.1,
        "degradation_rate": 0.5
    }

@router.post("/anomaly-detection")
async def detect_anomalies(
    location_ids: List[int],
    threshold: float = 0.8,
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Detect anomalies in production data"""
    
    anomalies = []
    for location_id in location_ids:
        # Mock anomaly detection
        if location_id % 2 == 0:
            anomalies.append({
                "location_id": location_id,
                "anomaly_detected": True,
                "type": "underperformance",
                "severity": "medium",
                "timestamp": datetime.utcnow().isoformat(),
                "description": "Production 15% below expected",
                "recommended_action": "Check inverter status"
            })
    
    return anomalies

@router.get("/comparison")
async def compare_locations(
    location_ids: List[int],
    metric: str = "production",
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Compare performance across multiple locations"""
    
    comparisons = []
    for i, location_id in enumerate(location_ids):
        comparisons.append({
            "location_id": location_id,
            "metric_value": 100 + i * 10,
            "rank": i + 1,
            "percentage_of_best": 100 - (i * 5)
        })
    
    return {
        "metric": metric,
        "period": "last_30_days",
        "locations": comparisons,
        "best_performer": location_ids[0] if location_ids else None
    }