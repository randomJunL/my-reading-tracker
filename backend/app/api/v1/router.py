from fastapi import APIRouter

from app.api.v1.routes import health, me, readers

api_router = APIRouter()
api_router.include_router(health.router, tags=["system"])
api_router.include_router(me.router, tags=["system"])
api_router.include_router(readers.router, tags=["readers"])
