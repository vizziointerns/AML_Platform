import json
import logging
import os
import time
from threading import Lock

import httpx
import jwt

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
TOKEN_URL = "https://oauth2.googleapis.com/token"

_token_cache: dict[str, str] = {}
_cache_lock = Lock()


def _load_service_account_info() -> dict:
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_KEY")
    if not raw:
        raise RuntimeError(
            "GOOGLE_SERVICE_ACCOUNT_KEY not configured. "
            "Set it to the JSON content or file path of your Google Service Account key."
        )
    if raw.startswith("{"):
        return json.loads(raw)
    with open(raw) as f:
        return json.load(f)


def _create_assertion(info: dict) -> str:
    now = int(time.time())
    payload = {
        "iss": info["client_email"],
        "scope": " ".join(SCOPES),
        "aud": TOKEN_URL,
        "iat": now,
        "exp": now + 3600,
    }
    return jwt.encode(payload, info["private_key"], algorithm="RS256")


def get_access_token() -> str:
    with _cache_lock:
        cached = _token_cache.get("token")
        expires_at = _token_cache.get("expires_at")
        if cached and expires_at and time.time() < float(expires_at):
            return cached

    info = _load_service_account_info()
    assertion = _create_assertion(info)

    with httpx.Client() as client:
        resp = client.post(
            TOKEN_URL,
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": assertion,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        token = data["access_token"]

    with _cache_lock:
        _token_cache["token"] = token
        _token_cache["expires_at"] = str(time.time() + 1800)

    return token


def get_auth_headers() -> dict[str, str]:
    token = get_access_token()
    return {
        "Authorization": f"Bearer {token}",
        "User-Agent": "AML-Platform/1.0",
    }
