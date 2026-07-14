from __future__ import annotations

import logging
import re

import httpx

logger = logging.getLogger(__name__)

DRIVE_FILES_API = "https://www.googleapis.com/drive/v3/files"


def extract_drive_id(url: str) -> str | None:
    match = re.search(r"[?&]id=([^&?]+)", url)
    if match:
        return match.group(1)
    if "googleapis.com/drive" in url:
        parts = url.split("/")
        for i, part in enumerate(parts):
            if part == "files" and i + 1 < len(parts):
                return parts[i + 1].split("?")[0]
    return None


def download_image_bytes(
    url: str,
    max_size: int,
    chunk_size: int = 64 * 1024,
) -> bytes:
    file_id = extract_drive_id(url)
    if file_id:
        from app.utils.google_drive_auth import get_drive_access_token

        access_token = get_drive_access_token()
        drive_url = f"{DRIVE_FILES_API}/{file_id}?alt=media"
        with httpx.Client(timeout=60, follow_redirects=True) as client:
            response = client.get(
                drive_url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            content = response.content
            if len(content) > max_size:
                raise ValueError(f"Image exceeds maximum size of {max_size} bytes")
            return content
    else:
        with httpx.Client(
            timeout=60,
            follow_redirects=True,
            max_redirects=20,
        ) as client:
            with client.stream("GET", url) as response:
                response.raise_for_status()
                chunks: list[bytes] = []
                total = 0
                for chunk in response.iter_bytes(chunk_size):
                    if total + len(chunk) > max_size:
                        raise ValueError(
                            f"Image exceeds maximum size of {max_size} bytes"
                        )
                    chunks.append(chunk)
                    total += len(chunk)
                return b"".join(chunks)
