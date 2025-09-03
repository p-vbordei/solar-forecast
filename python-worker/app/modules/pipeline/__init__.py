"""Pipeline orchestration module"""

from fastapi import APIRouter

router = APIRouter()

@router.post("/run")
async def run_pipeline(location_ids: list[int]):
    """Run data processing pipeline"""
    return {
        "status": "started",
        "location_ids": location_ids,
        "pipeline_id": "mock-pipeline-001"
    }

@router.get("/status/{pipeline_id}")
async def get_pipeline_status(pipeline_id: str):
    """Get pipeline execution status"""
    return {
        "pipeline_id": pipeline_id,
        "status": "running",
        "progress": 50
    }

pipeline_router = router