from __future__ import annotations

import logging
from typing import Any, cast
from urllib.parse import quote as _url_quote

import httpx
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response

from app.core.config import settings
from app.utils.google_drive_auth import async_get_drive_access_token

logger = logging.getLogger(__name__)

router = APIRouter()

DRIVE_FILES_API = "https://www.googleapis.com/drive/v3/files"
DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files"
FOLDER_MIME = "application/vnd.google-apps.folder"
ROOT_FOLDER_NAME = "test_folder"
SHARED_DRIVE_ID = settings.google_drive_shared_drive_id.strip() or None


def _drive_params(
    extra: dict[str, str] | None = None,
) -> dict[str, str]:
    params: dict[str, str] = {"supportsAllDrives": "true"}
    if SHARED_DRIVE_ID:
        params["includeItemsFromAllDrives"] = "true"
    if extra:
        params.update(extra)
    return params


def _escape_drive_query_value(value: str) -> str:
    return value.replace("'", "\\'")


async def _find_folder(
    access_token: str, name: str, parent_id: str | None = None
) -> str | None:
    safe_name = _escape_drive_query_value(name)
    query = (
        f"mimeType='{FOLDER_MIME}' and trashed=false"
        f" and name='{safe_name}'"
    )
    if parent_id:
        query += f" and '{parent_id}' in parents"

    params = _drive_params(
        {"q": query, "fields": "files(id,name)", "pageSize": "10"}
    )
    if SHARED_DRIVE_ID:
        params["driveId"] = SHARED_DRIVE_ID
        params["corpora"] = "drive"

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            DRIVE_FILES_API,
            params=params,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        data: Any = resp.json()
        files: list[dict[str, Any]] = data.get("files", [])
        if files:
            return cast(str, files[0]["id"])
        return None


async def _create_folder(
    access_token: str, name: str, parent_id: str | None = None
) -> str:
    body: dict[str, Any] = {
        "name": name,
        "mimeType": FOLDER_MIME,
    }
    if parent_id:
        body["parents"] = [parent_id]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            DRIVE_FILES_API,
            params=_drive_params(),
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=body,
        )
        resp.raise_for_status()
        return cast(str, resp.json()["id"])


async def _ensure_folder(
    access_token: str, name: str, parent_id: str | None = None
) -> str:
    existing = await _find_folder(access_token, name, parent_id)
    if existing:
        return existing
    return await _create_folder(access_token, name, parent_id)


async def _ensure_folder_hierarchy(
    access_token: str,
    project_name: str | None,
    dataset_name: str | None,
) -> str | None:
    if not project_name or not dataset_name:
        return None

    root_id: str | None = SHARED_DRIVE_ID
    if not root_id:
        root_id = await _ensure_folder(access_token, ROOT_FOLDER_NAME)

    project_folder_id = await _ensure_folder(access_token, project_name, root_id)
    dataset_folder_id = await _ensure_folder(
        access_token, dataset_name, project_folder_id
    )
    return dataset_folder_id


@router.post("/upload/drive")
async def upload_to_drive(
    request: Request,
    file_name: str = Query(...),
    project_name: str = Query(""),
    dataset_name: str = Query(""),
) -> dict[str, Any]:
    """Upload a file to Drive by streaming the raw request body through.

    Metadata (file name, project, dataset) is passed as query params.
    The file content is the raw POST body (not multipart).
    The backend streams each chunk to Drive as it arrives,
    so total time is ~ the slower of the two links, not the sum.
    """
    if not file_name:
        raise HTTPException(status_code=400, detail="file_name is required")

    mime_type = request.headers.get("content-type", "application/octet-stream")

    content_length = request.headers.get("content-length")
    if not content_length:
        raise HTTPException(status_code=411, detail="Content-Length header is required")

    try:
        access_token = await async_get_drive_access_token()

        parent_folder_id = await _ensure_folder_hierarchy(
            access_token,
            project_name or None,
            dataset_name or None,
        )

        # Create Drive resumable upload session (fast — metadata only)
        metadata: dict[str, Any] = {"name": file_name}
        if parent_folder_id:
            metadata["parents"] = [parent_folder_id]

        async with httpx.AsyncClient() as client:
            session_resp = await client.post(
                DRIVE_UPLOAD_API,
                params={"uploadType": "resumable", "supportsAllDrives": "true"},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "X-Upload-Content-Type": mime_type,
                },
                json=metadata,
            )
            session_resp.raise_for_status()
            session_url = session_resp.headers.get("Location")
            if not session_url:
                raise HTTPException(
                    status_code=502, detail="Drive did not return a session URL"
                )

        # Stream the incoming request body directly to Drive
        put_headers: dict[str, str] = {
            "Content-Type": mime_type,
            "Content-Length": content_length,
        }

        async with httpx.AsyncClient() as client:
            put_resp = await client.put(
                session_url,
                headers=put_headers,
                content=request.stream(),
            )
            put_resp.raise_for_status()
            drive_file_id = cast(str, put_resp.json()["id"])

        drive_url = (
            f"https://drive.google.com/uc?id={drive_file_id}"
            f"&name={_url_quote(file_name)}"
        )

        return {
            "drive_file_id": drive_file_id,
            "file_name": file_name,
            "file_url": drive_url,
            "mime_type": mime_type,
        }
    except httpx.HTTPStatusError as e:
        detail = f"Google Drive API error: {e.response.status_code}"
        try:
            err_body = e.response.json()
            detail = err_body.get("error", {}).get("message", detail)
        except Exception:
            logger.exception("Failed to parse Drive error response body")
        raise HTTPException(status_code=e.response.status_code, detail=detail) from e


@router.post("/upload/drive/create-dataset-folder")
async def create_dataset_folder(
    project_name: str = Query(...),
    dataset_name: str = Query(...),
) -> dict[str, str]:
    """Create the folder hierarchy on Drive for a new dataset."""
    try:
        access_token = await async_get_drive_access_token()
        dataset_folder_id = await _ensure_folder_hierarchy(
            access_token, project_name, dataset_name
        )
        if not dataset_folder_id:
            raise HTTPException(
                status_code=400, detail="Folder creation returned no ID"
            )
        return {"dataset_folder_id": dataset_folder_id}
    except httpx.HTTPStatusError as e:
        detail = f"Google Drive API error: {e.response.status_code}"
        try:
            err_body = e.response.json()
            detail = err_body.get("error", {}).get("message", detail)
        except Exception:
            logger.exception("Failed to parse Drive error response body")
        raise HTTPException(status_code=e.response.status_code, detail=detail) from e


@router.get("/images/drive/{file_id}")
async def proxy_drive_image(file_id: str) -> Response:
    access_token = await async_get_drive_access_token()
    url = f"{DRIVE_FILES_API}/{file_id}?alt=media"
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            url,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        content = resp.content
        content_type = resp.headers.get(
            "content-type", "image/jpeg"
        )

    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
        },
    )
