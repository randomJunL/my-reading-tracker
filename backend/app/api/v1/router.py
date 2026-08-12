from fastapi import APIRouter

from app.api.v1.routes import book_search, books, health, me, readers, reading_sessions

api_router = APIRouter()
api_router.include_router(health.router, tags=["system"])
api_router.include_router(me.router, tags=["system"])
api_router.include_router(readers.router, tags=["readers"])
api_router.include_router(book_search.router, tags=["book search"])
api_router.include_router(books.router, tags=["library"])
api_router.include_router(reading_sessions.router, tags=["reading sessions"])
