from fastapi import APIRouter

from app.api.v1.routes import (
    book_search,
    books,
    exports,
    health,
    me,
    readers,
    reading_sessions,
    reports,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["system"])
api_router.include_router(me.router, tags=["system"])
api_router.include_router(readers.router, tags=["readers"])
api_router.include_router(book_search.router, tags=["book search"])
api_router.include_router(books.router, tags=["library"])
api_router.include_router(reading_sessions.router, tags=["reading sessions"])
api_router.include_router(reports.router, tags=["reports"])
api_router.include_router(exports.router, tags=["exports"])
