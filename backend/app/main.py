from __future__ import annotations

from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.api.writes import router as writes_router
from app.config import get_settings
from app.errors import install_error_handlers


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request.state.request_id = request.headers.get(
            "X-Request-ID", f"REQ-{uuid4().hex[:8]}"
        )
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        return response

    @app.get("/health", tags=["operations"])
    def health() -> dict[str, str]:
        return {"status": "ok", "version": settings.app_version}

    app.include_router(router, prefix=settings.api_v1_prefix)
    app.include_router(writes_router, prefix=settings.api_v1_prefix)
    install_error_handlers(app)
    return app


app = create_app()
