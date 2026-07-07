from __future__ import annotations

import glob
import json
import logging
import os
import time
from threading import Lock
from typing import Any, cast

import httpx

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/drive.file"]
TOKEN_URL = "https://oauth2.googleapis.com/token"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob"

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
TOKEN_PATH = os.path.join(BACKEND_DIR, "drive_token.json")

_token_cache: dict[str, str] = {}
_cache_lock = Lock()


def _find_client_secret() -> dict[str, Any]:
    matches = sorted(glob.glob(os.path.join(BACKEND_DIR, "client_secret_*.json")))
    if not matches:
        raise RuntimeError(
            "No client_secret_*.json file found in backend/. "
            "Download it from Google Cloud Console → Credentials."
        )
    with open(matches[0]) as f:
        data = cast("dict[str, Any]", json.load(f))
    raw: Any = data.get("installed", data.get("web", {}))
    if not raw:
        raise RuntimeError("Invalid client secret format")
    installed: dict[str, Any] = cast("dict[str, Any]", raw)
    return installed


def get_auth_url() -> str:
    client_info = _find_client_secret()
    return (
        f"{AUTH_URL}"
        f"?client_id={client_info['client_id']}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&scope={' '.join(SCOPES)}"
        f"&response_type=code"
        f"&access_type=offline"
        f"&prompt=consent"
    )


def exchange_code(code: str) -> dict[str, Any]:
    client_info = _find_client_secret()
    with httpx.Client() as client:
        resp = client.post(
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


def save_token(token_data: dict[str, Any]) -> None:
    with open(TOKEN_PATH, "w") as f:
        json.dump(token_data, f, indent=2)
    logger.info("Saved OAuth token to %s", TOKEN_PATH)


def _load_token() -> dict[str, Any] | None:
    if os.path.exists(TOKEN_PATH):
        with open(TOKEN_PATH) as f:
            return cast(dict[str, Any], json.load(f))
    return None


def _refresh_access_token(
    refresh_token: str, client_info: dict[str, Any]
) -> dict[str, Any]:
    with httpx.Client() as client:
        resp = client.post(
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


def get_drive_access_token() -> str:
    with _cache_lock:
        cached = _token_cache.get("access_token")
        expires_at = _token_cache.get("expires_at")
        if cached and expires_at and time.time() < float(expires_at) - 60:
            return cached

    token_data = _load_token()
    if token_data and "refresh_token" in token_data:
        client_info = _find_client_secret()
        try:
            new_token = _refresh_access_token(
                token_data["refresh_token"], client_info
            )
        except Exception:
            logger.warning("OAuth refresh failed, falling back to service account")
            from app.utils.google_service_account import get_access_token

            return get_access_token()

        access_token = cast(
            str, new_token.get("access_token") or token_data.get("access_token")
        )
        expires_in = new_token.get("expires_in", 3600)

        token_data.update(new_token)
        save_token(token_data)

        with _cache_lock:
            _token_cache["access_token"] = access_token
            _token_cache["expires_at"] = str(time.time() + expires_in * 0.8)
        return access_token

    from app.utils.google_service_account import get_access_token

    return get_access_token()
