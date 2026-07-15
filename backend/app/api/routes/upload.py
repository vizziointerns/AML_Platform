from __future__ import annotations

import asyncio
import hashlib
import logging
import threading
from pathlib import Path
from typing import Any, cast

import httpx
import tempfile

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel

from app.core.config import settings
from app.utils.download import extract_drive_id
from app.utils.google_drive_auth import async_get_drive_access_token

# Simple in-memory upload status tracking
_upload_status: dict[str, str] = {}  # cache_url -> 'pending' | 'completed' | 'failed'
_UPLOAD_STATUS_LOCK = threading.Lock()

logger = logging.getLogger(__name__)

router = APIRouter()

DRIVE_FILES_API = "https://www.googleapis.com/drive/v3/files"
DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files"
FOLDER_MIME = "application/vnd.google-apps.folder"
SHARED_DRIVE_ID = settings.google_drive_shared_drive_id.strip() or None
PARENT_FOLDER_ID = settings.google_drive_parent_folder_id.strip() or None


def _drive_params(
    extra: dict[str, str] | None = None,
) -> dict[str, str]:
    params: dict[str, str] = {"supportsAllDrives": "true"}
    if SHARED_DRIVE_ID or PARENT_FOLDER_ID:
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
    user_id: str | None = None,
) -> str | None:
    if not project_name or not dataset_name:
        return None

    drive_root = SHARED_DRIVE_ID or PARENT_FOLDER_ID
    if drive_root:
        root_id = drive_root
    elif user_id:
        root_id = await _ensure_folder(access_token, user_id)
    else:
        root_id = await _ensure_folder(access_token, "unknown_user")

    project_folder_id = await _ensure_folder(access_token, project_name, root_id)
    dataset_folder_id = await _ensure_folder(
        access_token, dataset_name, project_folder_id
    )
    return dataset_folder_id


def _is_tiff_name(name: str) -> bool:
    lower = name.lower()
    return lower.endswith(".tif") or lower.endswith(".tiff")


COG_CACHE_DIR = (
    Path(__file__).parent.parent.parent.parent / "cache" / "cog"
)
COG_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _cog_cache_path(file_url: str) -> Path:
    key = hashlib.sha256(file_url.encode()).hexdigest()[:16]
    return COG_CACHE_DIR / f"{key}.tif"


@router.post("/upload/drive")
async def upload_to_drive(
    request: Request,
    file_name: str = Query(...),
    project_name: str = Query(""),
    dataset_name: str = Query(""),
    user_id: str = Query(""),
) -> dict[str, Any]:
    """Upload a file to Drive. Streams to local cache first, returns
    immediately with a cache:// URL. Drive upload runs in background.
    """
    if not file_name:
        raise HTTPException(status_code=400, detail="file_name is required")

    mime_type = request.headers.get("content-type", "application/octet-stream")

    content_length = request.headers.get("content-length")
    if not content_length:
        raise HTTPException(status_code=411, detail="Content-Length header is required")

    max_size = int(content_length)
    if max_size <= 0:
        raise HTTPException(status_code=400, detail="Invalid content-length")

    try:
        # Stream request body to a temp file so we don't hold 500 MB in memory
        hasher = hashlib.sha256()
        tmp = tempfile.NamedTemporaryFile(delete=False)
        try:
            async for chunk in request.stream():
                hasher.update(chunk)
                tmp.write(chunk)
            tmp.flush()
            tmp.close()

            content_hash = hasher.hexdigest()[:16]
            ext = ".tif" if _is_tiff_name(file_name) else ".bin"
            cache_url = f"cache://{content_hash}{ext}"
            cache_path = COG_CACHE_DIR / f"{content_hash}{ext}"

            # Move temp file to cache (atomic-ish)
            if not cache_path.exists():
                import shutil
                shutil.move(tmp.name, cache_path)
                logger.info("Cached %s (%s) locally: %s", file_name, ext, cache_path.name)
            else:
                Path(tmp.name).unlink(missing_ok=True)
        except Exception:
            Path(tmp.name).unlink(missing_ok=True)
            raise

        # Track upload status
        with _UPLOAD_STATUS_LOCK:
            _upload_status[cache_url] = "pending"

        # Upload to Drive in background — don't block the response
        async def _background_drive_upload(
            bg_cache_url: str,
            bg_cache_path_str: str,
        ) -> None:
            bg_cache_path = Path(bg_cache_path_str)
            try:
                bg_access_token = await async_get_drive_access_token()
                bg_parent_folder_id = await _ensure_folder_hierarchy(
                    bg_access_token,
                    project_name or None,
                    dataset_name or None,
                    user_id or None,
                )

                bg_metadata: dict[str, Any] = {"name": file_name}
                if bg_parent_folder_id:
                    bg_metadata["parents"] = [bg_parent_folder_id]

                async with httpx.AsyncClient(timeout=httpx.Timeout(600.0)) as client:
                    bg_session_resp = await client.post(
                        DRIVE_UPLOAD_API,
                        params={"uploadType": "resumable", "supportsAllDrives": "true"},
                        headers={
                            "Authorization": f"Bearer {bg_access_token}",
                            "Content-Type": "application/json",
                            "X-Upload-Content-Type": mime_type,
                        },
                        json=bg_metadata,
                    )
                    bg_session_resp.raise_for_status()
                    bg_session_url = bg_session_resp.headers.get("Location")
                    if not bg_session_url:
                        logger.error("Drive did not return a session URL for %s", file_name)
                        return

                    # Read from the cached file for the PUT
                    file_bytes = bg_cache_path.read_bytes()
                    bg_put_resp = await client.put(
                        bg_session_url,
                        headers={
                            "Content-Type": mime_type,
                            "Content-Length": content_length,
                        },
                        content=file_bytes,
                    )
                    bg_put_resp.raise_for_status()
                    bg_drive_file_id = cast(str, bg_put_resp.json()["id"])
                    logger.info(
                        "Background Drive upload complete: file_id=%s, name=%s",
                        bg_drive_file_id,
                        file_name,
                    )
                    with _UPLOAD_STATUS_LOCK:
                        _upload_status[bg_cache_url] = "completed"
            except Exception:
                logger.exception("Background Drive upload failed for %s", file_name)
                with _UPLOAD_STATUS_LOCK:
                    _upload_status[bg_cache_url] = "failed"

        asyncio.create_task(
            _background_drive_upload(cache_url, str(cache_path))
        )

        return {
            "drive_file_id": "",
            "file_name": file_name,
            "file_url": cache_url,
            "mime_type": mime_type,
            "drive_upload_status": "pending",
        }
    except httpx.HTTPStatusError as e:
        detail = f"Google Drive API error: {e.response.status_code}"
        try:
            err_body = e.response.json()
            detail = err_body.get("error", {}).get("message", detail)
            logger.error(
                "Drive upload error: status=%s, method=%s, url=%s, body=%s",
                e.response.status_code,
                e.request.method if e.request else "?",
                str(e.request.url) if e.request else "?",
                err_body,
            )
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


class DeleteDriveFilesRequest(BaseModel):
    file_urls: list[str]


@router.post("/images/drive/delete")
async def delete_drive_files(body: DeleteDriveFilesRequest) -> dict[str, int]:
    access_token = await async_get_drive_access_token()
    deleted = 0
    errors: list[str] = []

    async def _delete_one(file_id: str) -> None:
        nonlocal deleted
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{DRIVE_FILES_API}/{file_id}",
                params=_drive_params(),
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code == 204 or resp.status_code == 404:
                deleted += 1
            else:
                try:
                    err_body = resp.json()
                    errors.append(
                        err_body.get("error", {}).get("message", f"HTTP {resp.status_code}")
                    )
                except Exception:
                    errors.append(f"HTTP {resp.status_code}")

    tasks: list[Any] = []
    for url in body.file_urls:
        file_id = extract_drive_id(url) or url
        tasks.append(_delete_one(file_id))

    await asyncio.gather(*tasks)

    if errors:
        logger.warning("Drive delete errors (partial): %s", errors)

    return {"deleted_count": deleted}
