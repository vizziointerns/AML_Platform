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
import re
import mimetypes

# Simple in-memory upload status tracking
_upload_status: dict[str, str] = {}  # cache_url -> 'pending' | 'completed' | 'failed'
_UPLOAD_STATUS_LOCK = threading.Lock()
_upload_results: dict[str, dict[str, str]] = {}  # cache_url -> {drive_file_id, file_url}
_UPLOAD_RESULTS_LOCK = threading.Lock()

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
    dataset_id: str = Query(""),
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
                    bg_file_url = f"https://drive.google.com/uc?id={bg_drive_file_id}"
                    logger.info(
                        "Background Drive upload complete: file_id=%s, name=%s",
                        bg_drive_file_id,
                        file_name,
                    )
                    with _UPLOAD_STATUS_LOCK:
                        _upload_status[bg_cache_url] = "completed"
                    with _UPLOAD_RESULTS_LOCK:
                        _upload_results[bg_cache_url] = {
                            "drive_file_id": bg_drive_file_id,
                            "file_url": bg_file_url,
                        }
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


@router.get("/upload/drive/status")
async def check_upload_status(cache_url: str = Query(...)) -> dict[str, Any]:
    """Poll the status of a background Drive upload."""
    status = _upload_status.get(cache_url, "unknown")
    with _UPLOAD_RESULTS_LOCK:
        result = _upload_results.get(cache_url, {})
    return {
        "status": status,
        "drive_file_id": result.get("drive_file_id", ""),
        "file_url": result.get("file_url", ""),
    }


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


_MIME_MAGIC: dict[bytes, str] = {
	b"\x89PNG": "image/png",
	b"\xff\xd8": "image/jpeg",
	b"GIF8": "image/gif",
	b"RIFF": "image/webp",
	b"BM": "image/bmp",
}


def _detect_mime(data: bytes) -> str:
	for magic, mime in _MIME_MAGIC.items():
		if data.startswith(magic):
			return mime
	return "application/octet-stream"


@router.get("/cache/file")
async def serve_cache_file(url: str = Query(...)) -> Response:
	if not url.startswith("cache://"):
		raise HTTPException(status_code=400, detail="Invalid cache URL")
	hash_part = url.removeprefix("cache://")
	if hash_part.endswith(".tif"):
		hash_part = hash_part[:-4]
		ext = ".tif"
	elif hash_part.endswith(".bin"):
		hash_part = hash_part[:-4]
		ext = ".bin"
	else:
		ext = ".bin"
	if not re.fullmatch(r"[0-9a-f]{16}", hash_part):
		raise HTTPException(status_code=400, detail=f"Invalid cache ID: {hash_part}")
	cached = COG_CACHE_DIR / f"{hash_part}{ext}"
	if not cached.exists():
		cached = COG_CACHE_DIR / f"{hash_part}.bin"
	if not cached.exists():
		raise HTTPException(status_code=404, detail=f"Cached file not found: {url}")
	data = cached.read_bytes()
	content_type = _detect_mime(data)
	return Response(
		content=data,
		media_type=content_type,
		headers={
			"Cache-Control": "public, max-age=86400",
			"Access-Control-Allow-Origin": "*",
		},
	)


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


class DeleteDriveFolderRequest(BaseModel):
    folder_id: str


@router.post("/drive/delete-folder")
async def delete_drive_folder(body: DeleteDriveFolderRequest) -> dict[str, Any]:
    """List all files in a Drive folder, delete them, then delete the folder itself."""
    access_token = await async_get_drive_access_token()
    errors: list[str] = []

    async with httpx.AsyncClient() as client:
        page_token: str | None = None
        all_files: list[dict[str, Any]] = []

        while True:
            params = _drive_params({
                "q": f"'{body.folder_id}' in parents and trashed=false",
                "fields": "nextPageToken, files(id, mimeType)",
                "pageSize": "1000",
            })
            if page_token:
                params["pageToken"] = page_token

            list_resp = await client.get(
                DRIVE_FILES_API,
                params=params,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if list_resp.status_code != 200:
                try:
                    err_body = list_resp.json()
                    msg = err_body.get("error", {}).get("message", f"HTTP {list_resp.status_code}")
                except Exception:
                    msg = f"HTTP {list_resp.status_code}"
                raise HTTPException(
                    status_code=list_resp.status_code,
                    detail=f"Failed to list Drive folder contents: {msg}",
                )

            data: Any = list_resp.json()
            files = data.get("files", [])
            all_files.extend(files)
            page_token = data.get("nextPageToken")
            if not page_token:
                break

        async def _delete_one(file_id: str) -> None:
            resp = await client.delete(
                f"{DRIVE_FILES_API}/{file_id}",
                params=_drive_params(),
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code not in (204, 404):
                try:
                    err_body = resp.json()
                    errors.append(
                        err_body.get("error", {}).get("message", f"HTTP {resp.status_code}")
                    )
                except Exception:
                    errors.append(f"HTTP {resp.status_code}")

        file_count = len(all_files)

        # Delete all files inside the folder
        tasks: list[Any] = [_delete_one(f["id"]) for f in all_files]
        await asyncio.gather(*tasks)

        # Delete the folder itself
        folder_resp = await client.delete(
            f"{DRIVE_FILES_API}/{body.folder_id}",
            params=_drive_params(),
            headers={"Authorization": f"Bearer {access_token}"},
        )
        folder_deleted = folder_resp.status_code == 204
        if not folder_deleted and folder_resp.status_code != 404:
            try:
                err_body = folder_resp.json()
                errors.append(
                    f"Folder delete: {err_body.get('error', {}).get('message', f'HTTP {folder_resp.status_code}')}"
                )
            except Exception:
                errors.append(f"Folder delete: HTTP {folder_resp.status_code}")

    if errors:
        logger.warning("Drive delete-folder errors (partial): %s", errors)

    return {
        "files_deleted_count": file_count,
        "folder_deleted": folder_deleted,
        "folder_id": body.folder_id,
    }
