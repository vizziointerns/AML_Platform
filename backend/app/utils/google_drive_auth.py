from __future__ import annotations

import json
import logging
import os
import time
from threading import Lock
from typing import Any, cast

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/drive.file"]
TOKEN_URL = "https://oauth2.googleapis.com/token"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob"

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
TOKEN_PATH = os.path.join(BACKEND_DIR, "drive_token.json")

_token_cache: dict[str, str] = {}
_cache_lock = Lock()


def _get_oauth_client_info() -> dict[str, Any] | None:
    client_id = settings.google_oauth_client_id.strip() or None
    client_secret = settings.google_oauth_client_secret.strip() or None
    if client_id and client_secret:
        return {"client_id": client_id, "client_secret": client_secret}
    return None


def _get_refresh_token_from_env() -> str | None:
    token = settings.google_drive_refresh_token.strip() or None
    return token


def get_auth_url() -> str:
    client_info = _get_oauth_client_info()
    if not client_info:
        return _find_client_secret_url()
    return (
        f"{AUTH_URL}"
        f"?client_id={client_info['client_id']}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&scope={' '.join(SCOPES)}"
        f"&response_type=code"
        f"&access_type=offline"
        f"&prompt=consent"
    )


def _find_client_secret_url() -> str:
    import glob

    matches = sorted(glob.glob(os.path.join(BACKEND_DIR, "client_secret_*.json")))
    if not matches:
        raise RuntimeError(
            "No OAuth credentials found. Set GOOGLE_OAUTH_CLIENT_ID and "
            "GOOGLE_OAUTH_CLIENT_SECRET in .env, or place a "
            "client_secret_*.json file in the backend/ directory."
        )
    with open(matches[0]) as f:
        data = cast("dict[str, Any]", json.load(f))
    raw: Any = data.get("installed", data.get("web", {}))
    client_id = raw.get("client_id", "")
    return (
        f"{AUTH_URL}"
        f"?client_id={client_id}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&scope={' '.join(SCOPES)}"
        f"&response_type=code"
        f"&access_type=offline"
        f"&prompt=consent"
    )


def interactive_auth() -> dict[str, Any]:
    import webbrowser

    url = get_auth_url()
    print("Opening browser for Google Drive authorization...")
    print(f"If the browser doesn't open, visit:\n{url}\n")
    webbrowser.open(url)
    code = input("Paste the authorization code here and press Enter: ").strip()
    if not code:
        raise RuntimeError("No authorization code provided")
    import asyncio

    token = asyncio.run(_async_exchange_code(code))
    save_token(token)
    print("\u2713 Google Drive authorization complete!")
    print(f"  Token saved to {TOKEN_PATH}")
    return token


async def _async_exchange_code(code: str) -> dict[str, Any]:
    client_info = _get_oauth_client_info()
    if not client_info:
        client_info = _read_client_secret_file()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            TOKEN_URL,
            data={
                "code": code,
                "client_id": client_info["client_id"],
                "client_secret": client_info["client_secret"],
                "redirect_uri": REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        return cast(dict[str, Any], resp.json())


def _read_client_secret_file() -> dict[str, Any]:
    import glob

    matches = sorted(glob.glob(os.path.join(BACKEND_DIR, "client_secret_*.json")))
    if not matches:
        raise RuntimeError("No client_secret_*.json file found")
    with open(matches[0]) as f:
        data = cast("dict[str, Any]", json.load(f))
    raw: Any = data.get("installed", data.get("web", {}))
    return cast(dict[str, Any], raw)


def save_token(token_data: dict[str, Any]) -> None:
    with open(TOKEN_PATH, "w") as f:
        json.dump(token_data, f, indent=2)
    logger.info("Saved OAuth token to %s", TOKEN_PATH)


def _load_token() -> dict[str, Any] | None:
    if os.path.exists(TOKEN_PATH):
        with open(TOKEN_PATH) as f:
            return cast(dict[str, Any], json.load(f))
    return None


async def _async_refresh_access_token(
    refresh_token: str, client_info: dict[str, Any]
) -> dict[str, Any]:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            TOKEN_URL,
            data={
                "client_id": client_info["client_id"],
                "client_secret": client_info["client_secret"],
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        resp.raise_for_status()
        return cast(dict[str, Any], resp.json())


def _get_client_info() -> dict[str, Any]:
    client_info = _get_oauth_client_info()
    if client_info:
        return client_info
    return _read_client_secret_file()


async def async_get_drive_access_token() -> str:
    with _cache_lock:
        cached = _token_cache.get("access_token")
        expires_at = _token_cache.get("expires_at")
        if cached and expires_at and time.time() < float(expires_at) - 60:
            return cached

    refresh_token = _get_refresh_token_from_env()
    client_info = _get_client_info()

    if not refresh_token:
        token_data = _load_token()
        if token_data and "refresh_token" in token_data:
            refresh_token = token_data["refresh_token"]
        else:
            logger.warning("No refresh token found, falling back to service account")
            from app.utils.google_service_account import get_access_token

            return get_access_token()

    try:
        new_token = await _async_refresh_access_token(refresh_token, client_info)
    except httpx.HTTPStatusError:
        logger.exception("OAuth refresh failed, falling back to service account")
        from app.utils.google_service_account import get_access_token

        return get_access_token()
    except httpx.RequestError as exc:
        logger.warning("OAuth refresh network error: %s", exc)
        from app.utils.google_service_account import get_access_token

        return get_access_token()

    access_token = cast(str, new_token.get("access_token"))
    expires_in = new_token.get("expires_in", 3600)

    token_data = _load_token() or {}
    token_data.update(new_token)
    token_data["refresh_token"] = refresh_token
    save_token(token_data)

    with _cache_lock:
        _token_cache["access_token"] = access_token
        _token_cache["expires_at"] = str(time.time() + expires_in * 0.8)
    return access_token


def get_drive_access_token() -> str:
    import asyncio

    return asyncio.run(async_get_drive_access_token())
