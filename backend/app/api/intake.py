from __future__ import annotations

import hashlib
from pathlib import Path

from fastapi import APIRouter, Depends, Header, Request, status
from pydantic import ValidationError
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile

from app.api.dependencies import require_internal_service
from app.config import Settings, get_settings
from app.database import get_db
from app.errors import APIError
from app.schemas import (
    Experiment,
    ExperimentCreateRequest,
    ExperimentImportConfirmRequest,
    ExperimentImportCreateRequest,
    ExperimentImportJob,
    ExperimentImportSource,
    ExperimentImportSourceType,
    ImportInterpretationRequest,
)
from app.services.agent_gateway import AgentGateway, get_agent_gateway
from app.services.idempotency import get_replay, store_response
from app.services.intake import (
    confirm_import,
    create_experiment,
    create_import_job,
    get_import_job,
    get_import_source,
    persist_interpretation,
)

router = APIRouter()


@router.post(
    "/experiments", response_model=Experiment, status_code=status.HTTP_201_CREATED
)
def create_canonical_experiment(
    request: ExperimentCreateRequest,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Experiment:
    payload = request.model_dump(mode="json")
    scope = "POST:/api/v1/experiments"
    with session.begin():
        replay = get_replay(session, scope=scope, key=idempotency_key, payload=payload)
        if replay is not None:
            return Experiment.model_validate(replay)
        response = create_experiment(
            session,
            organization_id=settings.default_organization_id,
            request=request,
        )
        store_response(
            session,
            scope=scope,
            key=idempotency_key,
            payload=payload,
            status_code=201,
            response_body=response.model_dump(mode="json"),
        )
        return response


async def _parse_import_request(
    request: Request, settings: Settings
) -> tuple[ExperimentImportSourceType, str, bytes, str | None, dict]:
    content_type = request.headers.get("content-type", "").lower()
    if content_type.startswith("application/json"):
        try:
            body = ExperimentImportCreateRequest.model_validate(await request.json())
        except (ValueError, ValidationError) as error:
            raise APIError(
                422,
                "VALIDATION_ERROR",
                "The import request did not match the API contract.",
            ) from error
        content = body.text.encode("utf-8")
        if len(content) > settings.import_max_bytes:
            raise APIError(413, "FILE_TOO_LARGE", "The import exceeds the size limit.")
        payload = {
            "source_type": body.source_type.value,
            "source_name": body.source_name,
            "source_sha256": hashlib.sha256(content).hexdigest(),
        }
        return body.source_type, body.source_name, content, body.text, payload

    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        upload = form.get("file")
        if not isinstance(upload, UploadFile):
            raise APIError(422, "VALIDATION_ERROR", "A file upload is required.")
        filename = upload.filename or ""
        suffix = Path(filename).suffix.lower()
        source_types = {
            ".pdf": ExperimentImportSourceType.PDF,
            ".docx": ExperimentImportSourceType.DOCX,
            ".txt": ExperimentImportSourceType.TXT,
        }
        source_type = source_types.get(suffix)
        if source_type is None:
            raise APIError(
                400,
                "UNSUPPORTED_FILE_TYPE",
                "Only PDF, DOCX, and TXT imports are supported.",
            )
        content = await upload.read(settings.import_max_bytes + 1)
        if not content:
            raise APIError(400, "EMPTY_IMPORT", "The imported file is empty.")
        if len(content) > settings.import_max_bytes:
            raise APIError(413, "FILE_TOO_LARGE", "The import exceeds the size limit.")
        source_name_value = form.get("source_name")
        source_name = (
            str(source_name_value).strip() if source_name_value else filename
        )
        if not source_name or len(source_name) > 255:
            raise APIError(
                422,
                "VALIDATION_ERROR",
                "source_name must contain between 1 and 255 characters.",
            )
        source_text = None
        if source_type is ExperimentImportSourceType.TXT:
            try:
                source_text = content.decode("utf-8")
            except UnicodeDecodeError as error:
                raise APIError(
                    400,
                    "INVALID_TEXT_ENCODING",
                    "TXT imports must use UTF-8 encoding.",
                ) from error
        elif source_type is ExperimentImportSourceType.PDF and not content.startswith(
            b"%PDF-"
        ):
            raise APIError(400, "UNSUPPORTED_FILE_TYPE", "The file is not a valid PDF.")
        elif source_type is ExperimentImportSourceType.DOCX and not content.startswith(
            b"PK"
        ):
            raise APIError(400, "UNSUPPORTED_FILE_TYPE", "The file is not a valid DOCX.")
        payload = {
            "source_type": source_type.value,
            "source_name": source_name,
            "source_sha256": hashlib.sha256(content).hexdigest(),
        }
        return source_type, source_name, content, source_text, payload

    raise APIError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Use application/json or multipart/form-data for experiment imports.",
    )


@router.post(
    "/experiment-imports",
    response_model=ExperimentImportJob,
    status_code=status.HTTP_202_ACCEPTED,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {
                    "schema": ExperimentImportCreateRequest.model_json_schema()
                },
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "required": ["file"],
                        "properties": {
                            "file": {"type": "string", "format": "binary"},
                            "source_name": {"type": "string", "maxLength": 255},
                        },
                    }
                },
            },
        }
    },
)
async def create_experiment_import(
    request: Request,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    gateway: AgentGateway = Depends(get_agent_gateway),
) -> ExperimentImportJob:
    source_type, source_name, content, source_text, payload = (
        await _parse_import_request(request, settings)
    )
    scope = "POST:/api/v1/experiment-imports"
    replayed = False
    with session.begin():
        replay = get_replay(session, scope=scope, key=idempotency_key, payload=payload)
        if replay is not None:
            response = ExperimentImportJob.model_validate(replay)
            replayed = True
        else:
            response = create_import_job(
                session,
                organization_id=settings.default_organization_id,
                source_type=source_type,
                source_name=source_name,
                content=content,
                source_text=source_text,
            )
            store_response(
                session,
                scope=scope,
                key=idempotency_key,
                payload=payload,
                status_code=202,
                response_body=response.model_dump(mode="json"),
            )
    if not replayed:
        gateway.dispatch_import(response.id)
    return response


@router.get("/experiment-imports/{import_id}", response_model=ExperimentImportJob)
def read_experiment_import(
    import_id: str,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ExperimentImportJob:
    return get_import_job(
        session,
        organization_id=settings.default_organization_id,
        import_id=import_id,
    )


@router.get(
    "/experiment-imports/{import_id}/source",
    response_model=ExperimentImportSource,
    dependencies=[Depends(require_internal_service)],
)
def read_experiment_import_source(
    import_id: str,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ExperimentImportSource:
    return get_import_source(
        session,
        organization_id=settings.default_organization_id,
        import_id=import_id,
    )


@router.post(
    "/experiment-imports/{import_id}/interpretation",
    response_model=ExperimentImportJob,
    dependencies=[Depends(require_internal_service)],
)
def record_import_interpretation(
    import_id: str,
    request: ImportInterpretationRequest,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ExperimentImportJob:
    payload = request.model_dump(mode="json")
    scope = f"POST:/api/v1/experiment-imports/{import_id}/interpretation"
    with session.begin():
        replay = get_replay(session, scope=scope, key=idempotency_key, payload=payload)
        if replay is not None:
            return ExperimentImportJob.model_validate(replay)
        response = persist_interpretation(
            session,
            organization_id=settings.default_organization_id,
            import_id=import_id,
            request=request,
        )
        store_response(
            session,
            scope=scope,
            key=idempotency_key,
            payload=payload,
            status_code=200,
            response_body=response.model_dump(mode="json"),
        )
        return response


@router.post(
    "/experiment-imports/{import_id}/confirm",
    response_model=Experiment,
    status_code=status.HTTP_201_CREATED,
)
def confirm_experiment_import(
    import_id: str,
    request: ExperimentImportConfirmRequest,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Experiment:
    payload = request.model_dump(mode="json")
    scope = f"POST:/api/v1/experiment-imports/{import_id}/confirm"
    with session.begin():
        replay = get_replay(session, scope=scope, key=idempotency_key, payload=payload)
        if replay is not None:
            return Experiment.model_validate(replay)
        response = confirm_import(
            session,
            organization_id=settings.default_organization_id,
            import_id=import_id,
            request=request,
        )
        store_response(
            session,
            scope=scope,
            key=idempotency_key,
            payload=payload,
            status_code=201,
            response_body=response.model_dump(mode="json"),
        )
        return response
