from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.projects import router as projects_router
from app.api.routes.annotations import router as annotations_router
from app.api.routes.training import router as training_router
from app.api.routes.classes import router as classes_router
from app.api.routes.export import router as export_router
from app.api.routes.inference import router as inference_router
from app.api.routes.segment import router as segment_router
from app.api.routes.upload import router as upload_router
from app.api.routes.cog import router as cog_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(projects_router, tags=["projects"])
api_router.include_router(annotations_router, tags=["annotations"])
api_router.include_router(training_router, tags=["training"])
api_router.include_router(classes_router, tags=["classes"])
api_router.include_router(export_router, tags=["export"])
api_router.include_router(inference_router, tags=["inference"])
api_router.include_router(segment_router, tags=["segment"])
api_router.include_router(cog_router, tags=["cog"])
api_router.include_router(upload_router, tags=["upload"])
