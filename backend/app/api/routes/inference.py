from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.training import TrainingRun
from app.schemas.inference import InferenceRequest, InferenceResponse
from app.training.inference import run_inference

router = APIRouter()


@router.post("/inference", response_model=InferenceResponse)
def inference_endpoint(body: InferenceRequest, db: Session = Depends(get_db)) -> InferenceResponse:
    model_path: str | None = None
    if body.model_id is not None:
        run = db.query(TrainingRun).filter(TrainingRun.id == body.model_id).first()
        if not run:
            raise HTTPException(status_code=404, detail="Training run not found")
        if run.status != "Completed":
            raise HTTPException(
                status_code=400,
                detail="Model is not ready (training not completed)",
            )
        weights = Path(__file__).resolve().parent.parent.parent.parent / "models" / str(body.model_id) / "best.pt"
        if not weights.exists():
            raise HTTPException(status_code=404, detail="Model weights file not found")
        model_path = str(weights)

    try:
        predictions = run_inference(body.image_url, model_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return InferenceResponse(predictions=predictions)
