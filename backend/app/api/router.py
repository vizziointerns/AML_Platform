from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.projects import router as projects_router
from app.api.routes.annotations import router as annotations_router
from app.api.routes.training import router as training_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(projects_router, tags=["projects"])
api_router.include_router(annotations_router, tags=["annotations"])
api_router.include_router(training_router, tags=["training"])
